// netlify/functions/quiz-generate.js
// Reading-first schema. Returns:
//   - segments[]: 8 short reading chunks (1-2 sentences, ≤20 words) with
//     focus_words + tip + phonemes for British pronunciation guidance
//   - quiz_cards[]: 2 quick-check cards inserted after segment 3 and 6
//     to reinforce what the reader has encountered
// English only, no IPA, no Chinese. A2-B1 vocabulary throughout.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English reading coach for non-native learners (A2-B1 level). You help them read English aloud with correct British pronunciation.

ABSOLUTE RULES — break any and the output is unusable:

A. BREVITY (rate-limited):
   - tip: ≤120 characters, ONE simple sentence
   - segment text: ≤20 English words
   - question: ≤120 characters
   - option: ≤30 characters
   - explanation: ≤120 characters

B. NO IPA symbols anywhere (/ɑː/, /æ/, /ə/, etc.). Describe sounds with:
   - plain re-spellings: "waw-tuh", "bah-th", "nyoo", "fuh-thuh"
   - physical instructions: "open your mouth wider", "pull your tongue back", "round your lips", "don't curl your tongue", "keep your tongue relaxed"
   - simple comparisons: "like saying 'ah' at the doctor", "softer at the end"

C. NO Chinese characters. Everything in simple English.

D. Output ONLY valid JSON — no markdown fences, no preamble, no trailing text.

SEGMENTATION — cover 100% of the source text:
- CRITICAL: every sentence of the source must appear in exactly one segment. Do not skip, summarise, or omit any part. The user is READING the article and needs ALL of it.
- Split in ORIGINAL ORDER. Do not rearrange.
- Each chunk = 1-2 sentences, max 20 English words. If a sentence is longer than 20 words, split it at a natural boundary (comma, conjunction).
- Segment count scales with text length:
    * ~100-300 words  →  6-12 segments
    * ~300-600 words  →  10-18 segments
    * ~600-1200 words →  18-26 segments
    * ~1200-2000 words → 22-30 segments  (HARD CAP: 30 segments)
- If the source is very short (<60 words), produce however many short segments are needed to cover it (minimum 4) — never pad with invented content.

FOCUS WORDS — for each segment:
- Pick 1-2 words where British pronunciation differs notably from American or where non-native speakers commonly stumble.
- Good targets: water, better, rather, after, car, father, mother, here, there, bath, path, castle, dance, chance, grass, glass, laugh, staff, new, news, tune, duke, Tuesday, student, hot, not, stop, got, on, go, home, phone, know, no.
- All focus_words must appear verbatim in the segment text (case-insensitive).
- Use the lowercase form in the focus_words array.

TIPS — one short English sentence per segment:
- Name the focus word(s) explicitly.
- Describe how to produce the British sound with a physical action OR plain re-spelling.
- No IPA. No linguistic jargon.

PHONEMES — for each focus word, give a dot-separated plain-English re-spelling:
- water → "W.AW.T.UH"
- better → "B.EH.T.UH"
- bath → "B.AH.TH"
- new → "N.Y.OO"
- hot → "H.OT"
- go → "G.UH.OO"
Use uppercase letters separated by dots. This is what users see — keep it intuitive, not phonetic.

QUIZ CARDS — insert short "quick check" cards spaced through the text:
- One quiz card per ~6 segments (round to integer): so 2 cards for 12 segments, 3 cards for 18 segments, 4-5 cards for 24-30 segments.
- Minimum 2 cards. Maximum 5 cards.
- Space the after_segment positions evenly. For 12 segments use after_segment 4 and 8. For 18 use 5, 11, 15. For 24 use 5, 11, 17, 22.
- Each card tests a pronunciation feature the reader has ALREADY encountered in the segments before it.
- question: a short English question.
- options: exactly 4 strings, ≤30 chars each. Only 1 correct.
- correct: integer 0-3.
- explanation: one short sentence with a physical action or re-spelling.`;

const USER_PROMPT_TEMPLATE = `Split this English text into reading segments with British pronunciation guidance.

"""
{TEXT}
"""

Return ONLY this JSON (the response is being prefilled to start with "{" — continue from there). No markdown, no preamble, no Chinese characters, no IPA.

{
  "segments": [
    {
      "position": 1,
      "text": "The water was rather cold this morning.",
      "focus_words": ["water", "rather"],
      "tip": "Don't pronounce the R at the end of 'water' and 'rather'. Say 'waw-tuh', 'rah-thuh'.",
      "phonemes": {
        "water": "W.AW.T.UH",
        "rather": "R.AH.TH.UH"
      }
    }
  ],
  "quiz_cards": [
    {
      "after_segment": 3,
      "question": "Which of these also has a SILENT R at the end in British English?",
      "options": ["stop", "better", "big", "hot"],
      "correct": 1,
      "explanation": "Better ends in R, silent in British English. Say 'bet-uh', not 'bet-er'."
    }
  ],
  "summary": "Short English summary of the main features practised.",
  "total_focus_words": 12
}

Cover EVERY sentence of the source text in exactly one segment, in order. Pick a segment count that fits the text length per the system instructions (6-30 segments). Insert 2-5 quiz cards spaced evenly through the article.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'POST only' });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return respond(400, { error: 'Invalid JSON' });
  }

  const { text } = body;
  if (!text || text.trim().length < 30) {
    return respond(400, { error: 'Text must be at least 30 characters' });
  }

  const trimmed = text.trim().slice(0, 2000);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: USER_PROMPT_TEMPLATE.replace('{TEXT}', trimmed) },
          { role: 'assistant', content: '{' },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Claude API error:', resp.status, err);
      return respond(502, { error: `AI service error (${resp.status}): ${err.slice(0, 300)}` });
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text || '';
    const stopReason = data.stop_reason || 'unknown';

    const withBrace = '{' + raw.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(withBrace);
    } catch (parseErr1) {
      const start = withBrace.indexOf('{');
      const end = withBrace.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          parsed = JSON.parse(withBrace.slice(start, end + 1));
        } catch (parseErr2) {
          console.error('JSON parse failed (after extract):', parseErr2, 'Raw:', raw.slice(0, 500));
          return respond(422, { error: `AI returned invalid format (stop_reason: ${stopReason}). Raw: ${raw.slice(0, 250)}` });
        }
      } else {
        console.error('JSON parse failed (no braces):', parseErr1, 'Raw:', raw.slice(0, 500));
        return respond(422, { error: `AI returned invalid format (stop_reason: ${stopReason}). Raw: ${raw.slice(0, 250)}` });
      }
    }

    // Sanitise segments
    if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      return respond(422, { error: 'AI generated no segments, please try different text' });
    }
    parsed.segments = parsed.segments.map((s, idx) => ({
      position: Number.isInteger(s.position) ? s.position : idx + 1,
      text: String(s.text || '').trim() || 'Missing segment text.',
      focus_words: (Array.isArray(s.focus_words) ? s.focus_words : [])
        .map(w => String(w).toLowerCase().replace(/[^a-z']/g, ''))
        .filter(Boolean)
        .slice(0, 3),
      tip: String(s.tip || ''),
      phonemes: (s.phonemes && typeof s.phonemes === 'object') ? s.phonemes : {},
    }));

    // Sanitise quiz_cards — filter out malformed ones
    parsed.quiz_cards = (Array.isArray(parsed.quiz_cards) ? parsed.quiz_cards : [])
      .filter(c =>
        c && typeof c === 'object' &&
        Number.isInteger(c.after_segment) &&
        c.after_segment >= 1 && c.after_segment <= parsed.segments.length &&
        Array.isArray(c.options) && c.options.length >= 2 &&
        Number.isInteger(c.correct) && c.correct >= 0 && c.correct < c.options.length
      )
      .map(c => ({
        after_segment: c.after_segment,
        question: String(c.question || ''),
        options: c.options.map(o => String(o)),
        correct: c.correct,
        explanation: String(c.explanation || ''),
      }));

    parsed.summary = String(parsed.summary || '');
    parsed.total_focus_words = parsed.segments.reduce((sum, s) => sum + (s.focus_words?.length || 0), 0);

    return respond(200, parsed);

  } catch (err) {
    console.error('Function error:', err);
    return respond(500, { error: 'Server error, please try again' });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function respond(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
