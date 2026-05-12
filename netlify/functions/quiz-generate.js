// netlify/functions/quiz-generate.js
// Receives English text, returns 3-5 British pronunciation quiz cards via Claude API
// This is the "Magic Import" equivalent — the WOW moment of the pretotype

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English pronunciation expert who specialises in helping Chinese-native speakers (Mandarin/Cantonese). You create quiz cards that test pronunciation KNOWLEDGE — not vocabulary or grammar.

Your cards must focus on these British English features that Chinese speakers struggle with:
- broad_A: /ɑː/ in bath, father, after, grass, castle, can't, dance (vs American /æ/)
- non_rhotic: dropping r after vowels — water /ˈwɔːtə/, car /kɑː/, better /ˈbetə/
- yod: inserting /j/ — new /njuːz/, tune /tjuːn/, duke /djuːk/ (vs American /nuːz/)
- schwa: /ə/ in unstressed syllables — about /əˈbaʊt/, possible /ˈpɒsɪbəl/
- short_O: /ɒ/ in hot, stop, box, not (British rounded, vs American /ɑː/)
- diphthong: /əʊ/ in go, home, phone, know (vs American /oʊ/)
- connected: liaison between words — an apple → /ənˈæpl/

Rules:
1. Generate exactly 3-5 cards based on the text provided
2. Each card MUST reference a specific word FROM the user's text
3. Card types: "ipa_choice" (which IPA is correct), "comparison" (British vs American), "count" (how many instances of X), "concept" (what is X)
4. All explanations must be in Chinese (简体中文) — this is critical for the target audience
5. Make options plausible — wrong answers should be common mistakes Chinese speakers make
6. Return ONLY valid JSON, no markdown fences, no preamble`;

const USER_PROMPT_TEMPLATE = `Analyse this English text and create pronunciation quiz cards for Chinese learners:

"""
{TEXT}
"""

Return this exact JSON structure:
{
  "cards": [
    {
      "type": "ipa_choice",
      "word": "the specific word from the text",
      "phoneme": "broad_A",
      "question_en": "What is the British pronunciation of 'bath'?",
      "question_zh": "'bath' 的英式发音是？",
      "options": ["/bæθ/", "/bɑːθ/", "/beɪθ/", "/biːθ/"],
      "correct": 1,
      "explain_zh": "英式英语中 bath 用 broad A /ɑː/，不是美式的 /æ/。中国人常把这个音发得太靠前，应该舌头后拉、嘴巴张大。",
      "explain_en": "British 'bath' uses broad A /ɑː/, not American trap A /æ/."
    }
  ],
  "summary_zh": "这段文字包含 X 个英式发音要点，主要涉及 broad A 和 non-rhotic 两个特征。",
  "difficulty": "B1"
}`;

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

  // Truncate to ~2000 chars to keep Claude fast + cheap
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
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: USER_PROMPT_TEMPLATE.replace('{TEXT}', trimmed),
        }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Claude API error:', resp.status, err);
      return respond(502, { error: `AI service error (${resp.status}): ${err.slice(0, 300)}` });
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text || '';

    // Parse JSON (strip any markdown fences just in case)
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let cards;
    try {
      cards = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse failed:', parseErr, 'Raw:', raw.slice(0, 500));
      return respond(422, { error: 'AI returned invalid format, please try again' });
    }

    // Validate structure
    if (!cards.cards || !Array.isArray(cards.cards) || cards.cards.length === 0) {
      return respond(422, { error: 'AI generated no cards, please try different text' });
    }

    return respond(200, cards);

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
