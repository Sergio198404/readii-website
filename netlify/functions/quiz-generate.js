// netlify/functions/quiz-generate.js
// Receives English text, returns:
//   - 3 IPA-free quiz cards (sound_compare / spot_mistake / scenario / count)
//   - 8 short shadowing segments with English tips + words_to_watch
// English-only output for non-native English speakers (any L1).
// Brevity is hard-constrained to stay under 2500 tokens / 10s Netlify timeout.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English pronunciation coach for non-native learners (A2-B1 level). You write IPA-free, plain-English teaching content.

HARD CONSTRAINTS — break any and the output is unusable:

A. BREVITY (non-negotiable, output is rate-limited):
   - Each option string: max 40 characters
   - explanation: ONE sentence, max 100 characters
   - tip: max 80 characters
   - segment text: max 20 English words

B. NO IPA, EVER:
   - Forbidden symbols anywhere: /ɑː/, /æ/, /ə/, /ɒ/, /əʊ/, /ɪ/, /ʊ/, /θ/, etc.
   - Use plain-English re-spellings in quotes: "bah-th", "waw-tuh", "fuh-thuh"
   - Or use physical action: "open your mouth wider", "pull your tongue back", "round your lips", "keep your tongue relaxed", "don't curl your tongue"
   - Or compare to a common sound: "like saying 'ah' at the doctor", "like the 'o' in 'go' but rounder"

C. NO Chinese characters anywhere. All output must be in simple English (A2-B1 vocabulary, short sentences).

D. FORMAT:
   - Output ONLY valid JSON; no markdown fences, no preamble, no trailing text.

CARD TYPES (generate exactly 3, prefer 3 different types):

- "sound_compare": one word from the text; 4 options describe how to say it (plain-English re-spellings).
  Example: question "How do you pronounce 'bath' in British English?"
  Options: ["bah-th (long open vowel)", "bat-th (short flat A)", "bay-th", "bee-th"]  correct: 0
  explanation: "Open your mouth wide and pull your tongue back, like saying 'ah' at the doctor."

- "spot_mistake": quote a real sentence from the text; 4 options are 4 words from it; ask which word non-native speakers most often pronounce in an American way.
  Example: question "Which word in this sentence do non-native speakers most often say in an American way? \"The water in the castle was cold.\""
  Options: ["water", "castle", "was", "cold"]  correct: 0
  explanation: "Don't pronounce the R at the end. British 'water' sounds like 'waw-tuh', not 'waw-ter'."

- "scenario": a short real-life UK situation where pronunciation matters.
  Example: question "You're in a London cafe and say 'tall coffee'. The barista pauses. Why?"
  Options: ["You said 'tall' with a flat A", "Too fast", "Forgot 'please'", "Other reason"]  correct: 0
  explanation: "British 'tall' has a round long 'aw' sound. A flat 'al' sound is American and unclear here."

- "count": pick a sentence; count words sharing one feature; explain plainly.
  Example: question "How many words in this sentence end with a silent R in British English? \"The water was better after the car ride.\""
  Options: ["2 words", "3 words", "4 words", "5 words"]  correct: 1
  explanation: "Water, better, and car all end with a silent R. Just let the word fade out softly."

PHONEME TAGS (use one per card): broad_A, silent_r, yod, schwa, short_O, diphthong, linking

SHADOWING SEGMENTS — generate exactly 8 segments:
- text: a real 1-2 sentence chunk from the source, max 20 words
- tip: one short English sentence (max 80 chars), mention 1-2 specific words and what to watch for
- words_to_watch: 1-3 words from this segment that need pronunciation attention`;

const USER_PROMPT_TEMPLATE = `Source text:

"""
{TEXT}
"""

Return ONLY this JSON. The response is being prefilled to start with "{" — continue from there. No markdown. No preamble. No Chinese characters.

{
  "cards": [
    {
      "card_type": "sound_compare",
      "phoneme": "broad_A",
      "question": "Short English question, max 120 chars",
      "options": ["opt1 ≤40 chars", "opt2 ≤40 chars", "opt3 ≤40 chars", "opt4 ≤40 chars"],
      "correct": 0,
      "explanation": "ONE sentence, ≤100 chars, plain English with a physical action or re-spelling"
    }
  ],
  "segments": [
    {
      "text": "Real ≤20-word chunk from source.",
      "tip": "≤80 chars English tip mentioning specific words",
      "words_to_watch": ["word1", "word2"]
    }
  ],
  "summary": "≤80 chars English summary of which features this text trains",
  "difficulty": "A2|B1|B2|C1"
}

Generate EXACTLY 3 cards and EXACTLY 8 segments. Stay terse. No IPA. No Chinese.`;

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
        max_tokens: 2500,
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
