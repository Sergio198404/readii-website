// netlify/functions/quiz-generate.js
// Three-pass reading prep:
//   - segments[]: every sentence of the source, in original order (Pass 1)
//   - drill_words[]: 5-8 high-value British-pronunciation words from the article (Pass 2)
//   - quiz_cards[]: 1-2 quick checks shown between Pass 1 and Pass 2
// English-only output for non-native learners. No IPA. No Chinese.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English reading coach for non-native learners (A2-B1 level). You prepare structured reading sessions.

ABSOLUTE RULES:

A. NO IPA symbols anywhere. Use plain re-spellings ("waw-tuh", "bah-th", "nyoo") and physical actions ("open your mouth wider", "pull your tongue back", "round your lips", "keep your tongue relaxed").

B. NO Chinese characters. All output in simple English.

C. Output ONLY valid JSON — no markdown fences, no preamble, no trailing text.

D. BREVITY:
   - segment text: max 25 English words
   - tip: ONE sentence, max 100 characters
   - body: ONE sentence, max 100 characters
   - question: max 100 characters
   - option: max 30 characters
   - explanation: ONE sentence, max 120 characters

SEGMENTATION — cover 100% of the source text:
- CRITICAL: every sentence of the source must appear in exactly one segment. Do not skip, summarise, paraphrase, or invent content.
- Segments in ORIGINAL ORDER.
- One sentence per segment. If a sentence is longer than 25 words, split it at a natural pause (comma, semicolon, dash, conjunction).
- Source up to ~800 words → expect 12-30 segments depending on sentence length.

DRILL WORDS — produce 5-8 words:
- All drill_words must appear verbatim in the source text (case-insensitive).
- Pick words with the most DISTINCTIVE British pronunciation — features that non-native speakers commonly get wrong:
    * non-rhotic R: water, better, car, after, rather, father, mother, here, there, far, morning
    * broad A: bath, path, castle, dance, chance, grass, glass, laugh, staff, can't
    * yod insertion: new, news, tune, duke, Tuesday, student
    * short rounded O: hot, not, stop, got, on, lot
    * diphthong oh: go, home, phone, know, no, cold
- If the source has fewer than 5 such words, pick the closest 5 you can find. If it has more than 8, pick the most varied set (cover at least 2-3 different features).
- Use the lowercase form in the "word" field.
- "from_segment" is the 1-indexed position of the segment containing this word.
- "context_sentence" is the full segment text where the word appears (for context display).
- "phonemes" is a dot-separated plain-English re-spelling: water→"W.AW.T.UH", bath→"B.AH.TH", new→"N.Y.OO". Uppercase letters separated by dots. NEVER use IPA.
- "tip" tells the learner the key insight in one short sentence (re-spelling + what's wrong with American/native).
- "body" gives a physical instruction (mouth, tongue, lips) in one short sentence.
- "feature" is one of: "non-rhotic R", "broad A", "yod insertion", "short O", "diphthong", "linking".

QUIZ CARDS — produce exactly 1-2 quick checks (prefer 1 if the article is short, 2 if long):
- These appear between Pass 1 (reading) and Pass 2 (drilling).
- Each card tests the learner's ability to APPLY a British pronunciation rule to a NEW word (not one of the drill_words if possible).
- options: exactly 4 strings, only 1 correct.
- correct: integer 0-3.
- explanation: one short sentence with a physical action or re-spelling.`;

const USER_PROMPT_TEMPLATE = `Source text:

"""
{TEXT}
"""

Return ONLY this JSON. The response is being prefilled to start with "{" — continue from there. No markdown. No preamble. No Chinese characters. No IPA.

{
  "segments": [
    { "position": 1, "text": "The water was rather cold this morning." }
  ],
  "drill_words": [
    {
      "word": "water",
      "from_segment": 1,
      "context_sentence": "The water was rather cold this morning.",
      "phonemes": "W.AW.T.UH",
      "tip": "Don't pronounce the R at the end. Say 'waw-tuh'.",
      "body": "Keep your tongue relaxed. Don't curl the tip up.",
      "feature": "non-rhotic R"
    }
  ],
  "quiz_cards": [
    {
      "question": "Which of these words also has a SILENT R in British English?",
      "options": ["stop", "better", "big", "hot"],
      "correct": 1,
      "explanation": "'Better' ends in R, silent in British English. Say 'bet-uh', not 'bet-er'."
    }
  ],
  "summary": "12 sentences, 6 drill words. Focus: silent R, broad A.",
  "word_count": 145
}

Cover EVERY sentence of the source in exactly one segment, in original order. Produce 5-8 drill_words and 1-2 quiz_cards.`;

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

  // Smart truncation at sentence boundary
  let trimmed = text.trim();
  if (trimmed.length > 5000) {
    const cutPoint = trimmed.lastIndexOf('.', 5000);
    if (cutPoint > 3000) {
      trimmed = trimmed.slice(0, cutPoint + 1);
    } else {
      trimmed = trimmed.slice(0, 5000);
    }
  }

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
    }));

    // Sanitise drill_words — drop malformed entries
    parsed.drill_words = (Array.isArray(parsed.drill_words) ? parsed.drill_words : [])
      .filter(d => d && typeof d === 'object' && d.word)
      .map(d => ({
        word: String(d.word).toLowerCase().replace(/[^a-z']/g, ''),
        from_segment: Number.isInteger(d.from_segment) ? d.from_segment : 1,
        context_sentence: String(d.context_sentence || ''),
        phonemes: String(d.phonemes || ''),
        tip: String(d.tip || ''),
        body: String(d.body || ''),
        feature: String(d.feature || 'pronunciation'),
      }))
      .filter(d => d.word)
      .slice(0, 8);

    // Sanitise quiz_cards
    parsed.quiz_cards = (Array.isArray(parsed.quiz_cards) ? parsed.quiz_cards : [])
      .filter(c =>
        c && typeof c === 'object' &&
        Array.isArray(c.options) && c.options.length >= 2 &&
        Number.isInteger(c.correct) && c.correct >= 0 && c.correct < c.options.length
      )
      .map(c => ({
        question: String(c.question || ''),
        options: c.options.map(o => String(o)),
        correct: c.correct,
        explanation: String(c.explanation || ''),
      }))
      .slice(0, 2);

    parsed.summary = String(parsed.summary || '');
    parsed.word_count = Number.isInteger(parsed.word_count)
      ? parsed.word_count
      : (trimmed.split(/\s+/).length || 0);
    parsed.was_truncated = trimmed.length < text.trim().length;

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
