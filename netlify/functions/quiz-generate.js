// netlify/functions/quiz-generate.js
// Receives English text, returns:
//   - 3 IPA-free quiz cards (sound_compare / spot_mistake / scenario / count)
//   - 8 short shadowing segments with Chinese tips + words_to_watch
// Designed for Chinese-native learners — no IPA symbols anywhere.
// Brevity is a hard constraint: total output must fit in 2500 tokens / 10s Netlify timeout.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English pronunciation coach for Chinese learners. You write IPA-free, ultra-concise teaching content.

HARD CONSTRAINTS — break any and the output is unusable:

A. BREVITY (this is non-negotiable, output is rate-limited):
   - Each option string: max 20 characters
   - explain_zh: ONE sentence, max 60 Chinese characters
   - tip_zh: max 30 Chinese characters
   - segment text: max 20 English words

B. NO IPA, EVER:
   - Forbidden symbols: /ɑː/, /æ/, /ə/, /ɒ/, /əʊ/, /ɪ/, /ʊ/, /θ/, etc. — anywhere in output
   - Describe sounds with Chinese near-homophones in quotes: 像"巴-斯", 像"沃-特", 像"扣"
   - Or describe physical action: 嘴大张, 舌后拉, 唇圆起, 喉松

C. FORMAT:
   - All Chinese text in simplified characters (简体中文)
   - Output ONLY valid JSON; no markdown fences, no preamble, no trailing text

CARD TYPES (generate exactly 3, prefer 3 different types):

- "sound_compare": one word from text; 4 options describe how to pronounce it (Chinese near-homophones).
  Example: question_zh "英式 bath 怎么读？"
  Options: ["像'巴-斯'，'啊'拉长", "像'拜-斯'，短'a'", "像'贝-斯'", "像'比-斯'"]  correct: 0
  explain_zh: "嘴大张、舌后拉，像叹气说'啊'。"

- "spot_mistake": quote a real sentence; 4 options are 4 words from that sentence; ask which word Chinese speakers most often read American.
  Example: question_zh "这句里哪个词最易读成美式？\"The water in the castle was cold.\""
  Options: ["water", "castle", "was", "cold"]  correct: 0
  explain_zh: "water 词尾 r 不发音，读'沃-特'，不是'沃-特儿'。"

- "scenario": short UK scenario where pronunciation matters.
  Example: question_zh "你在伦敦说 'tall coffee'，店员一愣，为什么？"
  Options: ["tall 读成短'a'，像'tal'", "语速太快", "忘说 please", "其它原因"]  correct: 0
  explain_zh: "英式 tall 圆唇拉长'o'，像中文'透-l'。"

- "count": pick a sentence; count words sharing one feature; explain in Chinese.
  Example: question_zh "下句里几个词的词尾 r 在英式不发音？\"The water was better after the car ride.\""
  Options: ["2 个", "3 个", "4 个", "5 个"]  correct: 1
  explain_zh: "water/better/car 词尾 r 不发音，舌头别卷起。"

PHONEME TAGS (use one per card): broad_A, silent_r, yod, schwa, short_O, diphthong, linking

SHADOWING SEGMENTS — generate exactly 8 segments:
- text: a real 1-2 sentence chunk from the source, ≤20 English words
- tip_zh: ≤30 Chinese chars, mention 1-2 specific words
- words_to_watch: 1-3 strings, words from this segment`;

const USER_PROMPT_TEMPLATE = `Source text:

"""
{TEXT}
"""

Return ONLY this JSON. The response is being prefilled to start with "{" — continue from there. No markdown. No preamble.

{
  "cards": [
    {
      "card_type": "sound_compare",
      "phoneme": "broad_A",
      "question_zh": "≤30 字中文问题",
      "options": ["选项1 ≤20字", "选项2 ≤20字", "选项3 ≤20字", "选项4 ≤20字"],
      "correct": 0,
      "explain_zh": "≤60 字一句话，含物理动作，无 IPA"
    }
  ],
  "segments": [
    {
      "text": "Real ≤20-word chunk from source.",
      "tip_zh": "≤30 字中文提示，提到具体词",
      "words_to_watch": ["word1", "word2"]
    }
  ],
  "summary_zh": "≤40 字总结",
  "difficulty": "A2|B1|B2|C1"
}

Generate EXACTLY 3 cards and EXACTLY 8 segments. Stay terse. No IPA.`;

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
        tip_zh: '注意整段的发音节奏和连读。',
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
