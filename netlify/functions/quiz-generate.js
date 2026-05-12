// netlify/functions/quiz-generate.js
// Receives English text, returns:
//   - 3 IPA-free quiz cards (sound_compare / spot_mistake / scenario / count)
//   - 8-12 short shadowing segments with Chinese tips + words_to_watch
// Designed for Chinese-native learners — no IPA symbols anywhere.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a British English pronunciation coach for Chinese-native speakers (Mandarin/Cantonese). You teach pronunciation through INTUITION and physical action, not phonetics theory.

ABSOLUTE RULES — break any of these and the output is unusable:
1. NEVER use IPA symbols anywhere. No /ɑː/, /æ/, /ə/, /ɒ/, /əʊ/, /njuː/, etc. Chinese learners do not read IPA.
2. Describe sounds with Chinese approximations in quotes — like 像中文"巴-斯" for "bath", 像中文"沃-特" for "water", 像中文"扣特" for "caught".
3. Explain every sound as a physical action — 嘴巴张大, 舌头往后拉, 嘴唇圆起来, 像叹气说"啊", 喉咙放松.
4. All explanations and questions in simplified Chinese (简体中文). English allowed only in question_en (the source phrase) and the segment text itself.
5. Output is ONLY valid JSON. No markdown fences, no preamble, no trailing commentary.

CARD TYPES — generate exactly 3 cards, ideally using 3 different types:

- "sound_compare": contrast British vs American (or wrong) pronunciation of one word from the text. Use Chinese approximation strings as options.
  Example options for "bath":
    ["像中文'巴-斯'，'啊'拉长，嘴巴张大", "像中文'拜-斯'，短促的'a'", "像中文'贝-斯'，类似'败'", "像中文'比-斯'"]
  Correct: 0. explain_zh: "英式 bath 嘴巴张大、舌头往后拉，像叹长气说'啊'。美式读得短而靠前，像'a'。"

- "spot_mistake": quote a real sentence from the user's text, ask which word a Chinese speaker is MOST likely to mispronounce / read as American. Options are 4 words taken from that sentence.
  Example question_zh: "这句话里哪个词中国人最容易读成美式发音？\"The water in the castle was rather cold.\""
  Options: ["water", "castle", "rather", "cold"]
  Correct: 0. explain_zh: "water 词尾 r 在英式里不发音，读'沃-特'，不是美式的'沃-特儿'。"

- "scenario": real-life situation in the UK where a pronunciation choice matters. The user picks the explanation.
  Example question_zh: "你在伦敦星巴克说 'I want a tall coffee'，店员一愣。最可能的原因是？"
  Options like: ["你把 tall 读成了短 a，听起来像 'tal'", "你的语速太快", "你忘了说 please", "其它"]
  Correct: 0. explain_zh: "英式 tall 像中文'透-l'，'o' 圆唇拉长。中国人常读成短促的'tal'，店员会困惑。"

- "count": pick a sentence from the text, ask "how many words in this sentence have feature X?". Feature explained in Chinese with physical action — NO IPA.
  Example question_zh: "下面这句话里，有几个词的词尾 r 在英式英语里不发音？\"The water was better after the car ride.\""
  Options: ["2 个", "3 个", "4 个", "5 个"]
  Correct: 1. explain_zh: "water, better, car 三个词的词尾 r 在英式里不发音，这叫'非卷舌'。读时舌头自然放下，不要卷起来。"

PRONUNCIATION FEATURES to focus on (pick whichever fits the text best):
- broad A: bath, father, after, grass, castle, can't — 嘴巴张大像"啊"
- silent r (non-rhotic): water, car, better, mother — 词尾 r 不发音
- yod insertion: new, tune, duke, news — 多加一个 j 音
- schwa: unstressed syllables — 喉咙放松发"呃"
- short O: hot, stop, box, not — 圆唇短"o"，不要发成"a"
- diphthong oh: go, home, phone, know — 英式"oh"，不是美式"ou"
- linking: 不要把每个词分开，an apple → 连读成一个

SHADOWING SEGMENTS — generate 8-12 short segments:
- Each segment = 1-2 sentences from the user's text, MAX 20 English words.
- text: copy a real chunk from the source text (you may very lightly edit for sentence boundaries but keep meaning).
- tip_zh: ONE short Chinese sentence telling the learner the key pronunciation point in this segment (mention 1-2 specific words). Use Chinese approximations, not IPA.
- words_to_watch: 1-3 specific words from the segment that need pronunciation attention (string array).`;

const USER_PROMPT_TEMPLATE = `Analyse this English text and produce a pronunciation quiz + shadow-reading plan for a Chinese learner.

"""
{TEXT}
"""

Return ONLY this JSON structure (the model is being prefilled to start with "{" — continue from there). No preamble. No markdown fences.

{
  "cards": [
    {
      "card_type": "sound_compare",
      "phoneme": "broad_A",
      "question_zh": "中文问题",
      "question_en": "Optional source sentence or word",
      "options": ["选项 1（用中文近似音描述）", "选项 2", "选项 3", "选项 4"],
      "correct": 0,
      "explain_zh": "用中文+物理动作解释，绝对不出现 IPA 符号"
    }
  ],
  "segments": [
    {
      "text": "The water was rather cold this morning.",
      "tip_zh": "注意 water 和 rather 词尾的 r 在英式里不发音，读'沃-特''拉-则'。",
      "words_to_watch": ["water", "rather"]
    }
  ],
  "summary_zh": "这段文字主要练习 [feature 1] 和 [feature 2]，难度 B1。",
  "difficulty": "B1"
}

Generate EXACTLY 3 cards and 8-12 segments. Do NOT use IPA symbols anywhere.`;

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

    // Prefilled "{" so prepend it back, then strip any stray markdown fences
    const withBrace = '{' + raw.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(withBrace);
    } catch (parseErr1) {
      // Fallback: extract substring between first { and last }
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

    // Validate cards
    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      return respond(422, { error: 'AI generated no cards, please try different text' });
    }

    // Validate / ensure segments exists (fall back to a single segment from source text)
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
