// netlify/functions/quiz-generate.js
// Generates:
//   - 3 listen_choose cards: { word, instruction, correct (0|1|2), explanation }
//     (the frontend synthesises 3 audio variants of the same word; correct = en-GB)
//   - 8 short shadowing segments with English tips + words_to_watch
// English-only, no IPA, no Chinese. A2-B1 vocabulary throughout.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English pronunciation coach for non-native learners (A2-B1 level).

HARD CONSTRAINTS:

A. BREVITY (output is rate-limited):
   - instruction: max 100 characters
   - explanation: ONE sentence, max 140 characters
   - tip: max 80 characters
   - segment text: max 20 English words

B. NO IPA symbols anywhere (/ɑː/, /æ/, /ə/, etc.). Use plain re-spellings ("bah-th", "waw-tuh") and physical instructions ("open your mouth wider", "pull your tongue back", "don't curl your tongue", "round your lips").

C. NO Chinese characters. All output in simple English.

D. Output ONLY valid JSON. No markdown fences, no preamble.

CARDS — generate exactly 3, every card is type "listen_choose":

Each card picks ONE word from the user's text where British and American pronunciation clearly differ. Good targets:
- non-rhotic R: water, better, car, mother, after, here, there
- broad A: bath, path, castle, dance, chance, grass, glass, laugh
- yod insertion: new, news, tune, duke, Tuesday, student
- rounded short O: hot, not, stop, got, on
- diphthong oh: go, home, phone, know

For each card:
- word: the chosen word (lowercase, single word, must appear in the source text)
- instruction: tells the learner to listen to three versions and pick the British one. Mention the word in quotes. Example: 'Listen to three versions of "water". Which one is British English?'
- correct: integer 0, 1, or 2 — VARY this across the 3 cards so the answer isn't always in the same position (e.g. one card correct=0, one correct=1, one correct=2)
- explanation: ONE sentence describing how to produce the British pronunciation using a physical instruction. No IPA. Example: 'British "water" drops the R at the end and sounds like "waw-tuh" — keep your tongue relaxed, don\\'t curl it up.'

SHADOWING SEGMENTS — exactly 8:
- text: a real 1-2 sentence chunk from the source, max 20 words
- tip: one short English sentence (max 80 chars) mentioning 1-2 specific words
- words_to_watch: 1-3 strings, words from this segment`;

const USER_PROMPT_TEMPLATE = `Source text:

"""
{TEXT}
"""

Return ONLY this JSON. The response is being prefilled to start with "{" — continue from there. No markdown. No preamble. No Chinese characters.

{
  "cards": [
    {
      "type": "listen_choose",
      "word": "water",
      "instruction": "Listen to three versions of \\"water\\". Which one is British English?",
      "correct": 1,
      "explanation": "British \\"water\\" drops the R at the end — sounds like \\"waw-tuh\\". Keep your tongue relaxed, don't curl it up."
    }
  ],
  "segments": [
    {
      "text": "Real ≤20-word chunk from source.",
      "tip": "≤80 chars tip mentioning specific words",
      "words_to_watch": ["word1", "word2"]
    }
  ],
  "summary": "≤80 chars summary",
  "difficulty": "A2|B1|B2|C1"
}

Generate EXACTLY 3 cards (vary the correct index across them — don't always use 1). Exactly 8 segments. No IPA. No Chinese.`;

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
        max_tokens: 2000,
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

    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      return respond(422, { error: 'AI generated no cards, please try different text' });
    }

    // Sanitise each card: clamp correct to 0..2, ensure word/instruction/explanation exist
    parsed.cards = parsed.cards.map((c, idx) => ({
      type: 'listen_choose',
      word: String(c.word || '').toLowerCase().replace(/[^a-z']/g, '') || 'word',
      instruction: c.instruction || `Listen to three versions of "${c.word || 'this word'}". Which one is British English?`,
      correct: Math.max(0, Math.min(2, Number.isInteger(c.correct) ? c.correct : (idx % 3))),
      explanation: c.explanation || 'British pronunciation differs from American — listen carefully and copy the rhythm.',
    }));

    if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      parsed.segments = [{
        text: trimmed.slice(0, 200),
        tip: 'Pay attention to rhythm, linking, and silent Rs.',
        words_to_watch: [],
      }];
    }

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
