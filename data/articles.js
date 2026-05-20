// data/articles.js
// ═════════════════════════════════════════════════════════════════════
// Single source of truth for ARTICLES_DATA + ARTICLE_QUOTES + STORAGE_BASE.
// Consumed by: quiz/index.html, admin/marketing-videos.html, scripts/*.js
//
// TODO(future): If admin gains article-editing UI, consider letting
//   my/index.html and v/index.html also pull from here instead of their
//   own simplified dicts. Currently they keep independent dicts because:
//   - my/  only needs title (1 field) — over-fetching full schema is waste
//   - v/   has a hand-curated landing blurb that differs from article.description
//
// Loading:
//   Browser: <script src="/data/articles.js"></script>  before main inline JS
//   Node:    const { ARTICLES_DATA, STORAGE_BASE } = require('../data/articles.js')
// ═════════════════════════════════════════════════════════════════════

const SUPABASE_PROJECT_REF = 'bltfljdgjxhcmbfduert';
const STORAGE_BASE = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public`;

const ARTICLES_DATA = {
  'apology': {
    id: 'apology',
    title: 'The Apology',
    author: 'Xiaoyu Su',
    tag: 'Daily Life',
    description: '"I apologise to objects. Last Tuesday, I bumped into a chair…"',
    estimated_minutes: 5,
    word_count: 240,
    audio_url: `${STORAGE_BASE}/article-audio/apology.mp3`,
    full_text: `There is a thing the English do, and after a year of living here, I have started doing it too.\n\nI apologise to objects.\n\nLast Tuesday, I bumped into a chair in a café. Not a person. A chair. Wooden, motionless, entirely innocent. And what did I say?\n\n"Sorry."\n\nOut loud. With feeling. The chair, naturally, said nothing back, which I have decided to interpret as passive aggression on its part.\n\nIt gets worse. I apologise when other people bump into me. I apologise when I cannot hear what someone has said. I apologised, last week, to a pigeon that walked rather too close to my shoe. The pigeon, like the chair, did not respond.\n\nMy English friends find this entirely normal. "Quite," they say, when I bring it up, which is the English way of meaning absolutely nothing.\n\nI have come to believe that "sorry" in England is not really an apology. It is more like a verbal handshake. A way of saying: I see you, you see me, neither of us wants any trouble. Let us continue avoiding each other politely for the remainder of our lives.\n\nAnd honestly?\n\nI rather like it.`,
    segments: [
      { position: 1, audio_filename: 'apology-01.mp3', text: "There is a thing the English do, and after a year of living here, I have started doing it too." },
      { position: 2, audio_filename: 'apology-02.mp3', text: "I apologise to objects." },
      { position: 3, audio_filename: 'apology-03.mp3', text: "Last Tuesday, I bumped into a chair in a café. Not a person. A chair." },
      { position: 4, audio_filename: 'apology-04.mp3', text: "Wooden, motionless, entirely innocent. And what did I say?" },
      { position: 5, audio_filename: 'apology-05.mp3', text: "\"Sorry.\" Out loud. With feeling." },
      { position: 6, audio_filename: 'apology-06.mp3', text: "The chair, naturally, said nothing back, which I have decided to interpret as passive aggression on its part." },
      { position: 7, audio_filename: 'apology-07.mp3', text: "It gets worse. I apologise when other people bump into me. I apologise when I cannot hear what someone has said." },
      { position: 8, audio_filename: 'apology-08.mp3', text: "I apologised, last week, to a pigeon that walked rather too close to my shoe. The pigeon, like the chair, did not respond." },
      { position: 9, audio_filename: 'apology-09.mp3', text: "My English friends find this entirely normal. \"Quite,\" they say, when I bring it up, which is the English way of meaning absolutely nothing." },
      { position: 10, audio_filename: 'apology-10.mp3', text: "I have come to believe that \"sorry\" in England is not really an apology. It is more like a verbal handshake." },
      { position: 11, audio_filename: 'apology-11.mp3', text: "A way of saying: I see you, you see me, neither of us wants any trouble." },
      { position: 12, audio_filename: 'apology-12.mp3', text: "Let us continue avoiding each other politely for the remainder of our lives." },
      { position: 13, audio_filename: 'apology-13.mp3', text: "And honestly? I rather like it." }
    ],
    drill_words: [
      { word: 'sorry', from_segment: 5, context_sentence: '"Sorry." Out loud. With feeling.', phonemes: 'S.O.R.EE', tip: "Round your lips for the O. Don't say 'sah-ree'.", body: "Short rounded O is the British signature.", feature: 'short O' },
      { word: 'rather', from_segment: 8, context_sentence: 'a pigeon that walked rather too close to my shoe', phonemes: 'R.AH.TH.UH', tip: "Silent R at the end. Say 'rah-thuh'.", body: "Open mouth for AH, drop the final R.", feature: 'non-rhotic R' },
      { word: 'café', from_segment: 3, context_sentence: 'I bumped into a chair in a café', phonemes: 'K.A.F.AY', tip: "Stress on first syllable: 'KAF-ay'.", body: "British keeps the original French stress pattern.", feature: 'stress pattern' },
      { word: 'ordinary', from_segment: 4, context_sentence: 'Wooden, motionless, entirely innocent', phonemes: 'OR.D.UH.N.REE', tip: "Three syllables: 'OR-d\\'n-ree'.", body: "British drops a syllable Americans keep.", feature: 'compressed syllables' },
      { word: 'absolutely', from_segment: 9, context_sentence: 'the English way of meaning absolutely nothing', phonemes: 'AB.S.UH.LOOT.LEE', tip: "Stress on 3rd: 'ab-suh-LOOT-lee'.", body: "Long OO with main stress on 'loot'.", feature: 'stress + long OO' },
      { word: 'pigeon', from_segment: 8, context_sentence: 'I apologised, last week, to a pigeon', phonemes: 'P.I.J.UN', tip: "Soft G + schwa: 'PIJ-un'.", body: "Don't say 'pi-JEEN'.", feature: 'soft G' },
      { word: 'naturally', from_segment: 6, context_sentence: 'The chair, naturally, said nothing back', phonemes: 'N.A.CH.UH.R.LEE', tip: "Say 'NACH-uh-r-lee', 4 syllables.", body: "Compressed but clear.", feature: 'compressed syllables' }
    ],
    decode_questions: [
      {
        question: "When the narrator's English friends say \"Quite,\" what do they really mean?",
        context: "\"Quite,\" they say, when I bring it up...",
        options: [
          "I completely agree with you",
          "I'm acknowledging what you said without committing to anything",
          "I think you're wrong",
          "I find this very funny"
        ],
        correct: 1,
        explanation: "\"Quite\" as a one-word response is classic English non-committal agreement. It means 'I'm hearing you, but I'm not going to engage further.' The author explicitly calls this 'the English way of meaning absolutely nothing.'"
      },
      {
        question: "The narrator says \"I rather like it\" at the end. What does this actually mean?",
        context: "And honestly? I rather like it.",
        options: [
          "I slightly enjoy it",
          "I'm undecided about it",
          "I genuinely love it",
          "I'm being sarcastic"
        ],
        correct: 2,
        explanation: "'I rather like it' is peak English understatement. When an English person says 'I rather like X,' they almost always mean they love X deeply. Direct enthusiasm feels uncomfortable, so feelings are diluted with 'rather.'"
      },
      {
        question: "The narrator describes saying sorry as \"a verbal handshake.\" What's the deeper cultural meaning?",
        context: "\"Sorry\" in England is more like a verbal handshake.",
        options: [
          "A formal greeting between strangers",
          "A way to start a real conversation",
          "A polite signal: I see you, neither of us wants trouble",
          "A sign of genuine remorse"
        ],
        correct: 2,
        explanation: "The narrator captures the entire English social contract here. Saying 'sorry' isn't apology — it's social lubricant designed to avoid friction. The English say sorry to maintain polite distance, not to express regret."
      }
    ],
    bgm_style: 'classical',
    background_hint: 'london cafe wooden interior',
    background_image: `${STORAGE_BASE}/article-images/apology-bg.jpg`,
    viral_segments: [11, 12],
    viral_pass_threshold: { max_rerecords: 2, min_duration_each: 1.5, max_duration_each: 15 }
  },

  'seven-novembers': {
    id: 'seven-novembers',
    title: 'Seven Novembers',
    author: 'Xiaoyu Su',
    tag: 'Reflection',
    description: '"I have lived in London for seven Novembers now. I still do not understand…"',
    estimated_minutes: 6,
    word_count: 255,
    audio_url: `${STORAGE_BASE}/article-audio/seven-novembers.mp3`,
    full_text: `I have lived in London for seven Novembers now.\n\nBill Bryson once wrote that the English have a particular gift for making the appalling seem charming. He was, I think, referring to the weather. But it works for almost everything here.\n\nI still do not understand how anyone affords a house in this city. I still do not know where the sun goes between October and April. I still cannot tell you what an English person means when they say their weekend was "fine."\n\nBut here is what I have learned.\n\nI have learned that "interesting" is rarely a compliment. That "I'll bear it in mind" usually means I have already forgotten. That when someone says "we should get coffee sometime," they are not, in fact, suggesting coffee.\n\nI have learned to find a strange comfort in grey light. To expect rain in June. To carry an umbrella I will not use because opening it would feel, somehow, like making a fuss.\n\nI am not English. I will never be English. My accent slips. My silences are not quite the right length.\n\nBut after seven Novembers, I have started apologising to furniture. I have started saying "rather" without meaning to. And last week, when someone asked how I was, I said —\n\n"Not too bad, thanks."\n\nAnd meant it.`,
    segments: [
      { position: 1, audio_filename: 'seven-novembers-01.mp3', text: "I have lived in London for seven Novembers now." },
      { position: 2, audio_filename: 'seven-novembers-02.mp3', text: "Bill Bryson once wrote that the English have a particular gift for making the appalling seem charming." },
      { position: 3, audio_filename: 'seven-novembers-03.mp3', text: "He was, I think, referring to the weather. But it works for almost everything here." },
      { position: 4, audio_filename: 'seven-novembers-04.mp3', text: "I still do not understand how anyone affords a house in this city." },
      { position: 5, audio_filename: 'seven-novembers-05.mp3', text: "I still do not know where the sun goes between October and April." },
      { position: 6, audio_filename: 'seven-novembers-06.mp3', text: "I still cannot tell you what an English person means when they say their weekend was \"fine.\"" },
      { position: 7, audio_filename: 'seven-novembers-07.mp3', text: "But here is what I have learned." },
      { position: 8, audio_filename: 'seven-novembers-08.mp3', text: "I have learned that \"interesting\" is rarely a compliment." },
      { position: 9, audio_filename: 'seven-novembers-09.mp3', text: "That \"I'll bear it in mind\" usually means I have already forgotten." },
      { position: 10, audio_filename: 'seven-novembers-10.mp3', text: "That when someone says \"we should get coffee sometime,\" they are not, in fact, suggesting coffee." },
      { position: 11, audio_filename: 'seven-novembers-11.mp3', text: "I have learned to find a strange comfort in grey light. To expect rain in June." },
      { position: 12, audio_filename: 'seven-novembers-12.mp3', text: "To carry an umbrella I will not use because opening it would feel, somehow, like making a fuss." },
      { position: 13, audio_filename: 'seven-novembers-13.mp3', text: "I am not English. I will never be English. My accent slips. My silences are not quite the right length." },
      { position: 14, audio_filename: 'seven-novembers-14.mp3', text: "But after seven Novembers, I have started apologising to furniture. I have started saying \"rather\" without meaning to." },
      { position: 15, audio_filename: 'seven-novembers-15.mp3', text: "And last week, when someone asked how I was, I said —" },
      { position: 16, audio_filename: 'seven-novembers-16.mp3', text: "\"Not too bad, thanks.\" And meant it." }
    ],
    drill_words: [
      { word: 'november', from_segment: 1, context_sentence: 'I have lived in London for seven Novembers now', phonemes: 'N.UH.V.EM.B.UH', tip: "Non-rhotic ending: 'nuh-VEM-buh'.", body: "Drop the final R completely. Schwa ending.", feature: 'non-rhotic R' },
      { word: 'weather', from_segment: 3, context_sentence: 'He was referring to the weather', phonemes: 'W.E.TH.UH', tip: "Voiced TH + silent R. Say 'WETH-uh'.", body: "Tongue between teeth, vibrate for voiced TH.", feature: 'voiced TH + non-rhotic' },
      { word: 'umbrella', from_segment: 12, context_sentence: 'To carry an umbrella I will not use', phonemes: 'UM.B.R.EL.UH', tip: "Stress on 2nd: 'um-BRELL-uh'.", body: "Schwa start, strong middle, schwa end.", feature: 'stress pattern' },
      { word: 'furniture', from_segment: 14, context_sentence: 'I have started apologising to furniture', phonemes: 'F.ER.N.I.CH.UH', tip: "Two silent Rs: 'FUR-ni-chuh'.", body: "British drops both R sounds here.", feature: 'double non-rhotic R' },
      { word: 'accent', from_segment: 13, context_sentence: 'My accent slips', phonemes: 'AK.S.UNT', tip: "Stress on first: 'AK-sent' (UK).", body: "Not 'ak-SENT' (that's American).", feature: 'stress pattern' },
      { word: 'rarely', from_segment: 8, context_sentence: '"interesting" is rarely a compliment', phonemes: 'RAIR.LEE', tip: "Long AIR: 'RAIR-lee'.", body: "Open mouth wider than 'really'.", feature: 'AIR diphthong' },
      { word: 'fine', from_segment: 6, context_sentence: 'their weekend was "fine."', phonemes: 'F.AHY.N', tip: "Long I diphthong: 'fyne'.", body: "Don't shorten the I.", feature: 'diphthong' }
    ],
    decode_questions: [
      {
        question: "What does it usually mean when an English person describes their weekend as \"fine\"?",
        context: "What an English person means when they say their weekend was \"fine.\"",
        options: [
          "It was genuinely good",
          "Anywhere from 'okay' to 'I'm having a breakdown but won't tell you'",
          "It was disappointing",
          "It was extraordinary"
        ],
        correct: 1,
        explanation: "\"Fine\" is the most ambiguous word in British English. Tone determines everything. \"It was FINE\" (with emphasis) often means it was not fine at all. The narrator points out you cannot decode this without knowing the speaker very well."
      },
      {
        question: "When an English colleague says \"I'll bear it in mind,\" what's likely happening?",
        context: "\"I'll bear it in mind\" usually means I have already forgotten.",
        options: [
          "They will carefully consider your suggestion",
          "They will share it with their team",
          "They have already mentally dismissed it",
          "They need more time to decide"
        ],
        correct: 2,
        explanation: "This is one of the most reliably deceptive English phrases. \"I'll bear it in mind\" is almost always a polite dismissal, not genuine consideration. English people who actually want to engage with your idea will ask follow-up questions."
      },
      {
        question: "Why does the ending \"Not too bad, thanks\" carry such emotional weight?",
        context: "\"Not too bad, thanks.\" And meant it.",
        options: [
          "It's a complaint disguised as a greeting",
          "It signals that the narrator finally speaks English-style: warm feelings expressed through understatement",
          "It means the narrator is still struggling",
          "It's a formal response required in business settings"
        ],
        correct: 1,
        explanation: "The English struggle to express positivity directly. \"Not too bad\" is one of the warmest casual responses many English people will give — saying \"brilliant\" or \"amazing\" feels uncomfortably enthusiastic. The narrator finally speaks the local emotional code, and means it."
      }
    ],
    bgm_style: 'lofi',
    background_hint: 'london rainy november grey',
    background_image: `${STORAGE_BASE}/article-images/seven-novembers-bg.jpg`,
    viral_segments: [14, 15],
    viral_pass_threshold: { max_rerecords: 2, min_duration_each: 1.5, max_duration_each: 15 }
  },

  'shop-closes-for-lunch': {
    id: 'shop-closes-for-lunch',
    title: 'The Shop That Closes for Lunch',
    author: 'Xiaoyu Su',
    tag: 'Business & Life',
    description: '"There is a bookshop near my flat in Marylebone that closes between one and two…"',
    estimated_minutes: 6,
    word_count: 258,
    audio_url: `${STORAGE_BASE}/article-audio/shop-closes-for-lunch.mp3`,
    full_text: `There is a bookshop near my flat in Marylebone that closes between one and two o'clock.\n\nI do not mean it gets busy at lunchtime. I mean it closes. A handwritten sign appears in the window: "Back at 2."\n\nFor the first six months, I found this infuriating. In London. A capital city. Closing the shop because the owner, presumably, wants a sandwich.\n\nThen, slowly, I came to admire it.\n\nThe shop is run by a woman in her sixties who has, as far as I can tell, no interest in scaling, no plan to franchise, and no ambition to be on Instagram. She knows her customers by name. She remembers what their daughters are reading. She orders three copies of a novel because she thinks three people might want it, and she is usually right.\n\nThere is a particular kind of British business that exists quietly in this way. It does not optimise. It does not pivot. It simply continues, year after year, doing one thing rather well, closing for lunch, and shutting altogether on Sundays because that is what Sundays are for.\n\nI sometimes think the rest of the world has lost something the English never quite gave up.\n\nThe bookshop, last I checked, has been there for thirty-one years.\n\nLong may it close for lunch.`,
    segments: [
      { position: 1, audio_filename: 'shop-closes-for-lunch-01.mp3', text: "There is a bookshop near my flat in Marylebone that closes between one and two o'clock." },
      { position: 2, audio_filename: 'shop-closes-for-lunch-02.mp3', text: "I do not mean it gets busy at lunchtime. I mean it closes." },
      { position: 3, audio_filename: 'shop-closes-for-lunch-03.mp3', text: "A handwritten sign appears in the window: \"Back at 2.\"" },
      { position: 4, audio_filename: 'shop-closes-for-lunch-04.mp3', text: "For the first six months, I found this infuriating. In London. A capital city." },
      { position: 5, audio_filename: 'shop-closes-for-lunch-05.mp3', text: "Closing the shop because the owner, presumably, wants a sandwich." },
      { position: 6, audio_filename: 'shop-closes-for-lunch-06.mp3', text: "Then, slowly, I came to admire it." },
      { position: 7, audio_filename: 'shop-closes-for-lunch-07.mp3', text: "The shop is run by a woman in her sixties who has, as far as I can tell, no interest in scaling, no plan to franchise, and no ambition to be on Instagram." },
      { position: 8, audio_filename: 'shop-closes-for-lunch-08.mp3', text: "She knows her customers by name. She remembers what their daughters are reading." },
      { position: 9, audio_filename: 'shop-closes-for-lunch-09.mp3', text: "She orders three copies of a novel because she thinks three people might want it, and she is usually right." },
      { position: 10, audio_filename: 'shop-closes-for-lunch-10.mp3', text: "There is a particular kind of British business that exists quietly in this way." },
      { position: 11, audio_filename: 'shop-closes-for-lunch-11.mp3', text: "It does not optimise. It does not pivot." },
      { position: 12, audio_filename: 'shop-closes-for-lunch-12.mp3', text: "It simply continues, year after year, doing one thing rather well, closing for lunch, and shutting altogether on Sundays because that is what Sundays are for." },
      { position: 13, audio_filename: 'shop-closes-for-lunch-13.mp3', text: "I sometimes think the rest of the world has lost something the English never quite gave up." },
      { position: 14, audio_filename: 'shop-closes-for-lunch-14.mp3', text: "The bookshop, last I checked, has been there for thirty-one years." },
      { position: 15, audio_filename: 'shop-closes-for-lunch-15.mp3', text: "Long may it close for lunch." }
    ],
    drill_words: [
      { word: 'marylebone', from_segment: 1, context_sentence: 'There is a bookshop near my flat in Marylebone', phonemes: 'MAR.LEE.BUN', tip: "Tricky! Say 'MAR-lee-bun'. Silent E.", body: "London place name, 3 syllables.", feature: 'place name' },
      { word: 'bookshop', from_segment: 1, context_sentence: 'There is a bookshop near my flat', phonemes: 'B.OOK.SH.OP', tip: "Compound stress: 'BOOK-shop'.", body: "First half stressed, like all British compounds.", feature: 'compound word' },
      { word: 'daughters', from_segment: 8, context_sentence: 'She remembers what their daughters are reading', phonemes: 'D.OR.T.UHZ', tip: "Silent GH + non-rhotic: 'DOR-tuhz'.", body: "'augh' sounds like 'or'. Drop final R.", feature: 'silent letters' },
      { word: 'franchise', from_segment: 7, context_sentence: 'no plan to franchise', phonemes: 'FR.AN.CH.AHYZ', tip: "Full diphthong: 'FRAN-chyze'.", body: "British keeps long I diphthong fully.", feature: 'long I' },
      { word: 'altogether', from_segment: 12, context_sentence: 'shutting altogether on Sundays', phonemes: 'AWL.T.UH.GE.TH.UH', tip: "Long AW + silent R: 'AWL-tuh-geth-uh'.", body: "Round lips for AW, drop final R.", feature: 'long AW' },
      { word: 'quietly', from_segment: 10, context_sentence: 'British business that exists quietly', phonemes: 'KW.AHY.UT.LEE', tip: "Tricky cluster: 'KWY-ut-lee'.", body: "Crisp K-W start.", feature: 'consonant cluster' },
      { word: 'sundays', from_segment: 12, context_sentence: 'shutting altogether on Sundays', phonemes: 'S.UN.DAYZ', tip: "Stress on 'SUN': 'SUN-dayz'.", body: "Day name, first syllable stressed.", feature: 'stress pattern' }
    ],
    decode_questions: [
      {
        question: "What does \"presumably\" signal here?",
        context: "Closing the shop because the owner, presumably, wants a sandwich.",
        options: [
          "Strong certainty about the reason",
          "A mild, slightly amused critical assumption",
          "Genuine confusion",
          "Sympathy with the owner"
        ],
        correct: 1,
        explanation: "\"Presumably\" lets the speaker imply something slightly mocking while sounding neutral. The English use it constantly to soften observations that might otherwise sound judgemental. Here it adds gentle irony to the narrator's frustration."
      },
      {
        question: "When the narrator says the shop does \"one thing rather well,\" what's the real meaning?",
        context: "Doing one thing rather well, closing for lunch...",
        options: [
          "Doing one thing acceptably",
          "Doing one thing in a mediocre way",
          "Doing one thing excellently (English understatement)",
          "Doing one thing by accident"
        ],
        correct: 2,
        explanation: "Like \"rather like it\" in The Apology, \"rather well\" almost always means \"excellently.\" The English dilute praise to avoid sounding boastful or overly emotional. Native English ears hear \"rather well\" and understand 'very well indeed.'"
      },
      {
        question: "Why does the final line \"Long may it close for lunch\" sound so quintessentially English?",
        context: "Long may it close for lunch.",
        options: [
          "It's a translation of a French toast",
          "It's grand language (like 'Long may she reign') applied affectionately to something small and ordinary",
          "It's a religious blessing",
          "It's a business slogan"
        ],
        correct: 1,
        explanation: "\"Long may it...\" is a quintessentially British construction echoing royal blessings like \"Long may she reign.\" Applied to a tiny bookshop's lunch break, it becomes warm, ironic, and uniquely English — the use of grand language for small, beloved things is peak British humour."
      }
    ],
    bgm_style: 'cinematic',
    background_hint: 'london independent bookshop warm wood',
    background_image: `${STORAGE_BASE}/article-images/shop-closes-bg.jpg`,
    viral_segments: [12, 13, 14],
    viral_pass_threshold: { max_rerecords: 2, min_duration_each: 1.5, max_duration_each: 15 }
  },

  'the-queue': {
    id: 'the-queue',
    title: 'The Queue',
    author: 'Readii Editorial',
    tag: 'Observation',
    description: '"In Britain, the queue is sacred. To break one is not impolite — it is criminal…"',
    estimated_minutes: 5,
    word_count: 268,
    audio_url: `${STORAGE_BASE}/article-audio/the-queue.mp3`,
    full_text: `In Britain, the queue is sacred.\n\nYou learn this on your first day. Not from a book — from a quiet, devastating look someone gives you at a bus stop.\n\nA queue is not just a line. It is a contract. An invisible agreement that says: I was here first. You were here next. We will all wait. Together. In silence.\n\nTo break a queue is not impolite. It is criminal. There is no act, short of murder, that a British person will resent more than someone pushing in.\n\nBut — and this is the interesting part — they will not say anything. They will tut. They will sigh. They will mutter to whoever is standing behind them. They will exchange glances of solidarity with strangers. But they will not, under any circumstances, speak to the offender directly.\n\nYou can join a queue without realising it. Three people standing vaguely near a counter? That is a queue. A small crowd at a bus stop? Look closer — there is order in there, somewhere.\n\nAmericans find this exhausting. Italians find it incomprehensible. The French refuse to participate.\n\nBut here is what no one tells you: queueing in Britain is a kind of love.\n\nIt is the country saying: I will wait, so that you may wait. I will not push, so that you are not pushed. We are all, briefly, equal — in our weary, drizzly patience.\n\nAfter six years here, I can spot a queue from across the street.\n\nAnd reader, I have come to find it beautiful.`,
    segments: [
      { position: 1, audio_filename: 'the-queue-01.mp3', text: "In Britain, the queue is sacred." },
      { position: 2, audio_filename: 'the-queue-02.mp3', text: "You learn this on your first day. Not from a book — from a quiet, devastating look someone gives you at a bus stop." },
      { position: 3, audio_filename: 'the-queue-03.mp3', text: "A queue is not just a line. It is a contract." },
      { position: 4, audio_filename: 'the-queue-04.mp3', text: "An invisible agreement that says: I was here first. You were here next. We will all wait. Together. In silence." },
      { position: 5, audio_filename: 'the-queue-05.mp3', text: "To break a queue is not impolite. It is criminal." },
      { position: 6, audio_filename: 'the-queue-06.mp3', text: "There is no act, short of murder, that a British person will resent more than someone pushing in." },
      { position: 7, audio_filename: 'the-queue-07.mp3', text: "But — and this is the interesting part — they will not say anything." },
      { position: 8, audio_filename: 'the-queue-08.mp3', text: "They will tut. They will sigh. They will mutter to whoever is standing behind them." },
      { position: 9, audio_filename: 'the-queue-09.mp3', text: "They will exchange glances of solidarity with strangers. But they will not, under any circumstances, speak to the offender directly." },
      { position: 10, audio_filename: 'the-queue-10.mp3', text: "You can join a queue without realising it. Three people standing vaguely near a counter? That is a queue." },
      { position: 11, audio_filename: 'the-queue-11.mp3', text: "Americans find this exhausting. Italians find it incomprehensible. The French refuse to participate." },
      { position: 12, audio_filename: 'the-queue-12.mp3', text: "But here is what no one tells you: queueing in Britain is a kind of love." },
      { position: 13, audio_filename: 'the-queue-13.mp3', text: "It is the country saying: I will wait, so that you may wait. I will not push, so that you are not pushed." },
      { position: 14, audio_filename: 'the-queue-14.mp3', text: "We are all, briefly, equal — in our weary, drizzly patience." },
      { position: 15, audio_filename: 'the-queue-15.mp3', text: "After six years here, I can spot a queue from across the street." },
      { position: 16, audio_filename: 'the-queue-16.mp3', text: "And reader, I have come to find it beautiful." }
    ],
    drill_words: [
      { word: 'queue', from_segment: 1, context_sentence: 'In Britain, the queue is sacred', phonemes: 'K.YOO', tip: "Sounds exactly like the letter 'Q'. Just 'kyoo'.", body: "Many silent letters. Don't pronounce u-e-u-e.", feature: 'silent letters' },
      { word: 'sacred', from_segment: 1, context_sentence: 'the queue is sacred', phonemes: 'S.AY.K.R.UHD', tip: "'SAY-krid', stress on first syllable.", body: "Long 'AY' sound at start, soft ending.", feature: 'stress pattern' },
      { word: 'criminal', from_segment: 5, context_sentence: 'it is criminal', phonemes: 'K.R.I.M.I.N.UHL', tip: "'CRIM-i-nuhl'. Three syllables. Stress on first.", body: "Soft schwa endings, British clipped.", feature: 'schwa endings' },
      { word: 'devastating', from_segment: 2, context_sentence: 'a quiet, devastating look', phonemes: 'D.E.V.UH.S.T.AY.T.ING', tip: "'DEV-uh-stay-ting'. Four syllables, stress on first.", body: "British speakers often clip the middle.", feature: 'syllable stress' },
      { word: 'solidarity', from_segment: 9, context_sentence: 'glances of solidarity', phonemes: 'S.O.L.I.D.A.R.UH.T.EE', tip: "'sol-i-DAR-i-tee'. Five syllables, stress on third.", body: "Long word — practice the rhythm: dah-dah-DAH-dah-dah.", feature: 'long word rhythm' },
      { word: 'incomprehensible', from_segment: 11, context_sentence: 'Italians find it incomprehensible', phonemes: 'IN.K.O.M.P.R.I.H.E.N.S.I.B.UHL', tip: "Six syllables. Stress on 'HEN': in-com-pre-HEN-si-buhl.", body: "Don't rush. Each syllable distinct.", feature: 'long word stress' }
    ],
    decode_questions: [
      {
        question: "Someone pushes in front of you at a coffee shop. The woman behind you sighs loudly. What's she really saying?",
        context: "They will tut. They will sigh. They will mutter to whoever is standing behind them.",
        options: [
          "She's tired from her day",
          "She's outraged you pushed in but will never say it directly",
          "She wants you to notice her",
          "She's clearing her throat"
        ],
        correct: 1,
        explanation: "In Britain, a sigh in a queue is a full sentence. It means: 'I cannot believe what just happened, and I will hold this against you forever — silently.' Direct confrontation is the one thing the British will not do."
      },
      {
        question: "Three people are standing vaguely near a counter. You walk past them. One says 'Excuse me — I think there's a queue?' What's actually happening?",
        context: "Three people standing vaguely near a counter? That is a queue.",
        options: [
          "They're asking a genuine question",
          "They're being friendly",
          "They're warning you — get to the back, now",
          "They're confused themselves"
        ],
        correct: 2,
        explanation: "'I think there's a queue?' is not a question. It's the British equivalent of 'STOP'. The rising tone is decorative; the meaning is firm. The polite phrasing is camouflage."
      },
      {
        question: "Someone pushes in. The person behind you mutters 'Some people, honestly' to their friend. Why are you suddenly part of this?",
        context: "They will mutter to whoever is standing behind them.",
        options: [
          "Just a general observation about humanity",
          "Indirect attack on the queue-jumper, shared with you as an ally",
          "A compliment about you",
          "Nothing — just background noise"
        ],
        correct: 1,
        explanation: "British complaint is always indirect. 'Some people, honestly' = 'That person is appalling, and I want you to know I noticed.' By muttering it near you, you are now allied — without speaking — against the offender."
      },
      {
        question: "At a British bus stop, no one speaks. Everyone glances at their watch. The bus is late. What's the social rule?",
        context: "We will all wait. Together. In silence.",
        options: [
          "Everyone is unfriendly",
          "Silence is the correct queue behaviour — speaking would break the unspoken contract",
          "Something has gone wrong",
          "People are anti-social in Britain"
        ],
        correct: 1,
        explanation: "Silence at a British bus stop is not coldness — it is the queue functioning correctly. The unspoken contract holds the strangers together. Watch-glancing is permitted; it counts as shared suffering."
      },
      {
        question: "You reach a shop entrance with another person. They say 'After you.' What should you do?",
        context: "We are all, briefly, equal — in our weary, drizzly patience.",
        options: [
          "Thank them and walk in",
          "Offer it back: 'Oh no, after YOU' — politeness battle is the correct ritual",
          "Ignore and enter",
          "Apologise for being there"
        ],
        correct: 1,
        explanation: "'After you' is rarely the end of the exchange. The correct British response is 'Oh no, after YOU.' This may continue 3-4 times before someone reluctantly goes first, with full eye contact and a small apologetic smile."
      }
    ],
    bgm_style: 'lofi',
    background_hint: 'london bus stop queue grey morning'
  },

  'talking-about-weather': {
    id: 'talking-about-weather',
    title: 'Talking About Weather',
    author: 'Readii Editorial',
    tag: 'Conversation',
    description: '"In England, weather is not weather. It is a handshake. A door opener…"',
    estimated_minutes: 5,
    word_count: 252,
    audio_url: `${STORAGE_BASE}/article-audio/talking-about-weather.mp3`,
    full_text: `In England, weather is not weather.\n\nIt is a handshake. A door opener. A way of saying hello without saying hello.\n\n"Lovely day, isn't it?" — this is not a question about meteorology. It is an invitation. To stand near each other, briefly, and confirm that we are both here, both human, both willing to acknowledge the existence of clouds.\n\nYou can have an entire conversation in England about the weather. People do. For hours.\n\n"Bit chilly this morning."\n"Felt like proper autumn, didn't it?"\n"They said rain later."\n"Mm. Wouldn't surprise me."\n\nNothing has been said. Everything has been understood.\n\nThere are rules. You may complain about heat, but only above 25 degrees, and only with theatrical suffering. You may praise cold, but never enthusiastically. You must always say "they said" when referring to forecasts, as if "they" were some distant, unreliable government.\n\nIf someone says "lovely day", you do not disagree. Even if it is raining. Even if you are wet. You say "isn't it?" and you mean it — because the day is, by definition, lovely when shared.\n\nThe first time I refused to discuss the weather, my colleague looked stricken. I had broken something. Not the conversation — the small, daily, fragile contract that says: we acknowledge each other.\n\nI have since become fluent.\n\nYesterday, walking past a stranger in the rain, I said — without thinking — "miserable, isn't it?"\n\nHe smiled. "Always is."\n\nAnd I understood, finally, that we had not talked about the rain at all.`,
    segments: [
      { position: 1, audio_filename: 'talking-about-weather-01.mp3', text: "In England, weather is not weather." },
      { position: 2, audio_filename: 'talking-about-weather-02.mp3', text: "It is a handshake. A door opener. A way of saying hello without saying hello." },
      { position: 3, audio_filename: 'talking-about-weather-03.mp3', text: "\"Lovely day, isn't it?\" — this is not a question about meteorology." },
      { position: 4, audio_filename: 'talking-about-weather-04.mp3', text: "It is an invitation. To stand near each other, briefly, and confirm that we are both here, both human." },
      { position: 5, audio_filename: 'talking-about-weather-05.mp3', text: "You can have an entire conversation in England about the weather. People do. For hours." },
      { position: 6, audio_filename: 'talking-about-weather-06.mp3', text: "\"Bit chilly this morning.\" \"Felt like proper autumn, didn't it?\"" },
      { position: 7, audio_filename: 'talking-about-weather-07.mp3', text: "\"They said rain later.\" \"Mm. Wouldn't surprise me.\"" },
      { position: 8, audio_filename: 'talking-about-weather-08.mp3', text: "Nothing has been said. Everything has been understood." },
      { position: 9, audio_filename: 'talking-about-weather-09.mp3', text: "There are rules. You may complain about heat, but only above 25 degrees, and only with theatrical suffering." },
      { position: 10, audio_filename: 'talking-about-weather-10.mp3', text: "You must always say \"they said\" when referring to forecasts, as if \"they\" were some distant, unreliable government." },
      { position: 11, audio_filename: 'talking-about-weather-11.mp3', text: "If someone says \"lovely day\", you do not disagree. Even if it is raining. Even if you are wet." },
      { position: 12, audio_filename: 'talking-about-weather-12.mp3', text: "You say \"isn't it?\" and you mean it — because the day is, by definition, lovely when shared." },
      { position: 13, audio_filename: 'talking-about-weather-13.mp3', text: "Yesterday, walking past a stranger in the rain, I said — without thinking — \"miserable, isn't it?\"" },
      { position: 14, audio_filename: 'talking-about-weather-14.mp3', text: "He smiled. \"Always is.\"" },
      { position: 15, audio_filename: 'talking-about-weather-15.mp3', text: "And I understood, finally, that we had not talked about the rain at all." }
    ],
    drill_words: [
      { word: 'weather', from_segment: 1, context_sentence: 'In England, weather is not weather', phonemes: 'W.E.TH.UH', tip: "Voiced TH + silent R. Say 'WETH-uh'.", body: "Tongue between teeth, vibrate. No R sound at end.", feature: 'voiced TH + non-rhotic' },
      { word: 'lovely', from_segment: 3, context_sentence: "Lovely day, isn't it?", phonemes: 'L.UH.V.L.EE', tip: "Short U like 'cup': 'LUV-lee'.", body: "Not 'low-vly'. British U is darker.", feature: 'vowel sound' },
      { word: 'meteorology', from_segment: 3, context_sentence: 'this is not a question about meteorology', phonemes: 'M.EE.T.EE.O.R.O.L.OH.G.EE', tip: "Six syllables: 'mee-tee-OR-ol-oh-gee'. Stress on 'OR'.", body: "Big word — practice the rhythm slowly.", feature: 'long word stress' },
      { word: 'chilly', from_segment: 6, context_sentence: 'Bit chilly this morning', phonemes: 'CH.I.L.EE', tip: "'CHIL-ee'. Short I, like 'fill'.", body: "Common British weather word. Use it freely.", feature: 'short vowel' },
      { word: 'forecasts', from_segment: 10, context_sentence: 'when referring to forecasts', phonemes: 'F.OR.K.AH.S.TS', tip: "Stress first: 'FOR-kahsts'. British 'AH' not 'AE'.", body: "American: 'FOR-kasts' (short A). British: long AH.", feature: 'British vs American vowel' },
      { word: 'theatrical', from_segment: 9, context_sentence: 'with theatrical suffering', phonemes: 'TH.EE.A.T.R.I.K.UHL', tip: "Four syllables: 'thee-AT-ri-kuhl'. Stress on AT.", body: "Voiceless TH at start (no vibration).", feature: 'voiceless TH' }
    ],
    decode_questions: [
      {
        question: "A stranger says 'Lovely day, isn't it?' on a normal grey morning. What are they really doing?",
        context: "\"Lovely day, isn't it?\" — this is not a question about meteorology.",
        options: [
          "Genuinely commenting on weather conditions",
          "Offering a social handshake — say 'isn't it?' back even if it's drizzling",
          "Being sarcastic about bad weather",
          "Expecting you to discuss meteorology"
        ],
        correct: 1,
        explanation: "'Lovely day' is a social handshake, not a weather report. The correct reply is 'isn't it?' — even if it's drizzling. You're not agreeing about weather; you're agreeing to acknowledge each other."
      },
      {
        question: "It's 28°C in July. Your British colleague slumps and says 'Goodness me, this is unbearable.' What's happening?",
        context: "You may complain about heat, but only above 25 degrees, and only with theatrical suffering.",
        options: [
          "Genuine medical distress",
          "Theatrical heat complaint — required vocabulary above 25°C",
          "She wants you to help her",
          "She's mocking British summers"
        ],
        correct: 1,
        explanation: "Above 25°C, the British heat complaint is performance art. 'Unbearable', 'tropical', 'absolute scorcher' — these are required vocabulary. Disagreeing ('I think it's pleasant') would be socially unsettling."
      },
      {
        question: "You ask if it will rain. Your colleague says 'They said it might.' Who is 'they'?",
        context: "You must always say \"they said\" when referring to forecasts, as if \"they\" were some distant, unreliable government.",
        options: [
          "A specific meteorologist she heard",
          "Standard British hedge — 'they' is the mythical, unidentified weather authority",
          "Her family members",
          "The radio she listened to"
        ],
        correct: 1,
        explanation: "'They said' is the British way of citing weather forecasts without committing to anything. 'They' is never identified. This protects everyone if it doesn't rain."
      },
      {
        question: "A stranger walking their dog in heavy rain says 'Bit grim, isn't it?' What's the right response?",
        context: "If someone says \"lovely day\", you do not disagree.",
        options: [
          "Tell them about the forecast",
          "Agree warmly — they're inviting you into the brotherhood of weather-sufferers",
          "Avoid eye contact",
          "Talk about their dog"
        ],
        correct: 1,
        explanation: "'Bit grim' between strangers in bad weather is an invitation. You're being welcomed into the silent club of 'People Out In This'. Correct response: 'Awful', 'Terrible', or simply 'Mm.'"
      },
      {
        question: "It snows in March, which is unusual. A British colleague says 'I don't remember it being this cold last year.' What's the correct response?",
        context: "we acknowledge each other.",
        options: [
          "Actually, last March was statistically colder — let me explain",
          "Agree sympathetically: 'No, awful, isn't it?'",
          "Discuss climate change",
          "Ignore them"
        ],
        correct: 1,
        explanation: "British weather memory is selective and emotional. 'I don't remember it being this cold' really means 'this is unpleasant and I want you to share my mild outrage'. Never correct them with facts."
      }
    ],
    bgm_style: 'lofi',
    background_hint: 'london rain grey street pedestrians'
  },

  'the-tea-question': {
    id: 'the-tea-question',
    title: 'The Tea Question',
    author: 'Readii Editorial',
    tag: 'Etiquette',
    description: '"In Britain, refusing a cup of tea is not a refusal. It is an alarm…"',
    estimated_minutes: 5,
    word_count: 258,
    audio_url: `${STORAGE_BASE}/article-audio/the-tea-question.mp3`,
    full_text: `In Britain, refusing a cup of tea is not a refusal.\n\nIt is an alarm.\n\nIf you walk into a British home and decline tea, your host will not be offended. They will be worried. They will assume something is wrong. They may ask, gently, if you are unwell.\n\n"Would you like a cup of tea?" is rarely a real question. The expected answer is yes. Saying no creates a small, polite emergency.\n\nThe British make tea for everything. Bad news? Tea. Good news? Tea. Bereavement, engagement, a dropped phone, a stubbed toe, a national crisis — there will be tea. Tea is the answer to a question no one has asked.\n\nThere are layers. "Cup of tea?" is casual. "Fancy a brew?" is friendly. "I'll put the kettle on" is decisive — the matter is settled.\n\nIf you do accept, more questions follow. Milk? Sugar? How strong? Most British people have a precise answer they have worked out over decades, and asking helps them perform it. "Builder's, two sugars" sounds simple. It is, in fact, an identity.\n\nTea is also a clock. Morning tea is functional. Eleven-ish is "elevenses" — a brief institution. Afternoon tea is a delicate event involving small sandwiches and serious decisions about cake.\n\nI have been here long enough that when something goes wrong, I find myself saying — automatically, helplessly — "I'll put the kettle on."\n\nIt does not solve anything.\n\nBut it gives us, briefly, somewhere to put our hands.\n\nAnd in Britain, that has always been enough.`,
    segments: [
      { position: 1, audio_filename: 'the-tea-question-01.mp3', text: "In Britain, refusing a cup of tea is not a refusal." },
      { position: 2, audio_filename: 'the-tea-question-02.mp3', text: "It is an alarm." },
      { position: 3, audio_filename: 'the-tea-question-03.mp3', text: "If you walk into a British home and decline tea, your host will not be offended. They will be worried." },
      { position: 4, audio_filename: 'the-tea-question-04.mp3', text: "They will assume something is wrong. They may ask, gently, if you are unwell." },
      { position: 5, audio_filename: 'the-tea-question-05.mp3', text: "\"Would you like a cup of tea?\" is rarely a real question. The expected answer is yes." },
      { position: 6, audio_filename: 'the-tea-question-06.mp3', text: "Saying no creates a small, polite emergency." },
      { position: 7, audio_filename: 'the-tea-question-07.mp3', text: "The British make tea for everything. Bad news? Tea. Good news? Tea." },
      { position: 8, audio_filename: 'the-tea-question-08.mp3', text: "Bereavement, engagement, a dropped phone, a stubbed toe, a national crisis — there will be tea." },
      { position: 9, audio_filename: 'the-tea-question-09.mp3', text: "Tea is the answer to a question no one has asked." },
      { position: 10, audio_filename: 'the-tea-question-10.mp3', text: "There are layers. \"Cup of tea?\" is casual. \"Fancy a brew?\" is friendly. \"I'll put the kettle on\" is decisive — the matter is settled." },
      { position: 11, audio_filename: 'the-tea-question-11.mp3', text: "If you do accept, more questions follow. Milk? Sugar? How strong?" },
      { position: 12, audio_filename: 'the-tea-question-12.mp3', text: "\"Builder's, two sugars\" sounds simple. It is, in fact, an identity." },
      { position: 13, audio_filename: 'the-tea-question-13.mp3', text: "I have been here long enough that when something goes wrong, I find myself saying — automatically, helplessly — \"I'll put the kettle on.\"" },
      { position: 14, audio_filename: 'the-tea-question-14.mp3', text: "It does not solve anything. But it gives us, briefly, somewhere to put our hands." },
      { position: 15, audio_filename: 'the-tea-question-15.mp3', text: "And in Britain, that has always been enough." }
    ],
    drill_words: [
      { word: 'refusing', from_segment: 1, context_sentence: 'refusing a cup of tea', phonemes: 'R.I.F.Y.OO.Z.ING', tip: "'ri-FYOO-zing'. Stress on second.", body: "Z sound in the middle, not S.", feature: 'stress pattern' },
      { word: 'kettle', from_segment: 10, context_sentence: "I'll put the kettle on", phonemes: 'K.E.T.UHL', tip: "'KET-uhl'. Two syllables, soft ending.", body: "British T is sharp here. Don't say 'KED-l'.", feature: 'British T' },
      { word: 'bereavement', from_segment: 8, context_sentence: 'Bereavement, engagement', phonemes: 'B.I.R.EE.V.M.UHNT', tip: "'bi-REEV-muhnt'. Three syllables, stress on REEV.", body: "Long EE in the middle.", feature: 'syllable stress' },
      { word: 'engagement', from_segment: 8, context_sentence: 'Bereavement, engagement', phonemes: 'IN.G.AY.J.M.UHNT', tip: "'in-GAYJ-muhnt'. Stress on second syllable.", body: "Long AY in the middle, soft ending.", feature: 'long vowel' },
      { word: 'elevenses', from_segment: 7, context_sentence: 'Eleven-ish is elevenses', phonemes: 'I.L.E.V.UHN.Z.UHZ', tip: "'i-LEV-uhn-zuhz'. Four syllables.", body: "British-only word. Means: tea around 11 AM.", feature: 'cultural word' },
      { word: 'helplessly', from_segment: 13, context_sentence: 'automatically, helplessly', phonemes: 'H.E.L.P.L.UH.S.L.EE', tip: "'HELP-luhs-lee'. Three syllables, stress on first.", body: "British schwa in middle.", feature: 'schwa pattern' }
    ],
    decode_questions: [
      {
        question: "You arrive at a British friend's house. They open the door and say 'Cup of tea?' What's actually happening?",
        context: "\"Would you like a cup of tea?\" is rarely a real question. The expected answer is yes.",
        options: [
          "A neutral question — say yes or no based on whether you want tea",
          "Welcoming ritual — saying no would disrupt the arrival ceremony",
          "Offer of a full meal",
          "Test of your manners"
        ],
        correct: 1,
        explanation: "'Cup of tea?' on arrival is barely a question. It's the British way of saying 'welcome' and 'sit down'. Refusing here doesn't just decline a drink — it disrupts the entire arrival ceremony."
      },
      {
        question: "You've just shared bad news with a British friend. They stand up and say 'I'll put the kettle on.' What does this really mean?",
        context: "Bereavement, engagement, a dropped phone, a stubbed toe, a national crisis — there will be tea.",
        options: [
          "They're avoiding the topic",
          "Highest form of British emotional response — sympathy made practical",
          "They're hungry",
          "They want you to leave soon"
        ],
        correct: 1,
        explanation: "When a British person responds to bad news with 'I'll put the kettle on', this is not avoidance — it is care made practical. The kettle is the British emergency response. The tea itself is irrelevant; the act of making it is the comfort."
      },
      {
        question: "At a British home, the host asks 'Milk? Sugar? How strong?' How seriously should you answer?",
        context: "Most British people have a precise answer they have worked out over decades.",
        options: [
          "Vaguely — 'however you make it' is fine",
          "Seriously — they need your specific tea identity to make it correctly",
          "Refuse to answer",
          "Ask for something other than tea"
        ],
        correct: 1,
        explanation: "Tea preferences in Britain are surprisingly serious. 'However you make it' is politely tolerated but slightly disappointing. Have a real answer ('milk, no sugar', 'just a splash of milk'). It signals you're a person of conviction."
      },
      {
        question: "Your British colleague says of another colleague: 'He's a builder's, three sugars man.' What's she communicating?",
        context: "\"Builder's, two sugars\" sounds simple. It is, in fact, an identity.",
        options: [
          "Random factual comment",
          "Character description — tea preference signals class and personality",
          "Recipe instruction",
          "Insult"
        ],
        correct: 1,
        explanation: "Tea reveals everything in Britain. 'Builder's' (strong, milky) suggests practical, working-class roots. 'Earl Grey, no milk' suggests something else entirely. This is gentle class commentary delivered through tea."
      },
      {
        question: "It's 11 AM at a British office. Someone announces 'Elevenses?' What are they doing?",
        context: "Eleven-ish is \"elevenses\" — a brief institution.",
        options: [
          "Asking what time it is",
          "Inviting everyone for a brief tea-and-biscuits break",
          "Counting something",
          "Making a joke about the time"
        ],
        correct: 1,
        explanation: "'Elevenses' is a small, sacred British institution: a tea break around 11 AM, often with a biscuit. Saying 'elevenses?' invites everyone within earshot. Declining is permitted; pretending you don't know what it means is suspicious."
      }
    ],
    bgm_style: 'lofi',
    background_hint: 'british kitchen teapot kettle morning'
  },

  'saying-goodbye': {
    id: 'saying-goodbye',
    title: 'Saying Goodbye',
    author: 'Readii Editorial',
    tag: 'Ritual',
    description: '"In Britain, \'I should get going\' is not a departure. It is an opening bid…"',
    estimated_minutes: 5,
    word_count: 261,
    audio_url: `${STORAGE_BASE}/article-audio/saying-goodbye.mp3`,
    full_text: `In Britain, saying goodbye takes longer than the visit.\n\n"I should probably get going" is not a departure. It is an opening bid. A signal that the goodbye process — which may take twenty minutes — has now, formally, begun.\n\nYou do not simply leave. That would be abrupt. Rude, even. Instead, you announce your intention to leave, and then you stay exactly where you are, continuing the conversation, for some time.\n\n"Right, I really must be off."\n\nYou do not move.\n\n"Anyway, I won't keep you."\n\nThis is said by the person who is, in fact, being kept. Nobody knows who is keeping whom. It does not matter. The ritual requires it.\n\nThen comes the migration. You move slowly toward the door, pausing at every stage to begin a new topic. The hallway is for one more story. The doorstep is for two more. The threshold may take another ten minutes, particularly if it is raining and someone says "ooh, it's coming down now."\n\nYou will be invited, at this point, to wait until the rain stops. You will decline. You will then wait anyway.\n\nAt the car, there is waving. Not a single wave — a sustained one. The host waves. You wave back. You drive off slowly so the waving can continue. They are still waving as you turn the corner.\n\nI used to find this exhausting.\n\nNow I do it too. Last week I said goodbye to a friend for thirty-five minutes.\n\nWe had a lovely time.`,
    segments: [
      { position: 1, audio_filename: 'saying-goodbye-01.mp3', text: "In Britain, saying goodbye takes longer than the visit." },
      { position: 2, audio_filename: 'saying-goodbye-02.mp3', text: "\"I should probably get going\" is not a departure. It is an opening bid." },
      { position: 3, audio_filename: 'saying-goodbye-03.mp3', text: "A signal that the goodbye process — which may take twenty minutes — has now, formally, begun." },
      { position: 4, audio_filename: 'saying-goodbye-04.mp3', text: "You do not simply leave. That would be abrupt. Rude, even." },
      { position: 5, audio_filename: 'saying-goodbye-05.mp3', text: "Instead, you announce your intention to leave, and then you stay exactly where you are, continuing the conversation, for some time." },
      { position: 6, audio_filename: 'saying-goodbye-06.mp3', text: "\"Right, I really must be off.\" You do not move." },
      { position: 7, audio_filename: 'saying-goodbye-07.mp3', text: "\"Anyway, I won't keep you.\" This is said by the person who is, in fact, being kept." },
      { position: 8, audio_filename: 'saying-goodbye-08.mp3', text: "Nobody knows who is keeping whom. It does not matter. The ritual requires it." },
      { position: 9, audio_filename: 'saying-goodbye-09.mp3', text: "Then comes the migration. You move slowly toward the door, pausing at every stage to begin a new topic." },
      { position: 10, audio_filename: 'saying-goodbye-10.mp3', text: "The hallway is for one more story. The doorstep is for two more." },
      { position: 11, audio_filename: 'saying-goodbye-11.mp3', text: "The threshold may take another ten minutes, particularly if it is raining and someone says \"ooh, it's coming down now.\"" },
      { position: 12, audio_filename: 'saying-goodbye-12.mp3', text: "You will be invited to wait until the rain stops. You will decline. You will then wait anyway." },
      { position: 13, audio_filename: 'saying-goodbye-13.mp3', text: "At the car, there is waving. Not a single wave — a sustained one." },
      { position: 14, audio_filename: 'saying-goodbye-14.mp3', text: "You drive off slowly so the waving can continue. They are still waving as you turn the corner." },
      { position: 15, audio_filename: 'saying-goodbye-15.mp3', text: "I used to find this exhausting. Now I do it too." },
      { position: 16, audio_filename: 'saying-goodbye-16.mp3', text: "Last week I said goodbye to a friend for thirty-five minutes. We had a lovely time." }
    ],
    drill_words: [
      { word: 'departure', from_segment: 2, context_sentence: 'is not a departure', phonemes: 'D.I.P.AR.CH.UH', tip: "'di-PAR-chuh'. Stress on PAR.", body: "British non-rhotic — no hard R at end.", feature: 'non-rhotic ending' },
      { word: 'abrupt', from_segment: 4, context_sentence: 'That would be abrupt', phonemes: 'UH.B.R.UH.P.T', tip: "'uh-BRUPT'. Stress on second.", body: "Sharp final consonant cluster -pt.", feature: 'consonant cluster' },
      { word: 'migration', from_segment: 9, context_sentence: 'Then comes the migration', phonemes: 'M.AI.G.R.AY.SH.UHN', tip: "'my-GRAY-shun'. Stress on GRAY.", body: "Long AY in stressed syllable.", feature: 'stress pattern' },
      { word: 'threshold', from_segment: 11, context_sentence: 'The threshold may take another ten minutes', phonemes: 'TH.R.E.SH.OH.L.D', tip: "'THRESH-ohld'. Voiceless TH at start.", body: "Tongue between teeth, no vibration.", feature: 'voiceless TH' },
      { word: 'sustained', from_segment: 13, context_sentence: 'a sustained one', phonemes: 'S.UH.S.T.AY.N.D', tip: "'suh-STAYND'. Stress on second.", body: "Long AY before final -nd.", feature: 'stress pattern' },
      { word: 'exhausting', from_segment: 15, context_sentence: 'I used to find this exhausting', phonemes: 'IG.Z.OR.S.T.ING', tip: "'ig-ZOR-sting'. The X sounds like 'gz'.", body: "Silent H. Stress on ZOR.", feature: 'silent letter' }
    ],
    decode_questions: [
      {
        question: "Your British host says 'I should probably get going' — wait, you're the guest. What's happening?",
        context: "\"I should probably get going\" is not a departure. It is an opening bid.",
        options: [
          "They want you to leave immediately",
          "It's the opening of a long goodbye ritual — nobody leaves yet",
          "They're confused about whose house it is",
          "They're being rude"
        ],
        correct: 1,
        explanation: "'I should get going' is the starting gun, not the finish line. It signals that the goodbye process — which can take 20+ minutes — has formally begun. Everyone stays exactly where they are."
      },
      {
        question: "Someone says 'Anyway, I won't keep you' — but you're the one trying to leave. Who's keeping whom?",
        context: "This is said by the person who is, in fact, being kept.",
        options: [
          "They genuinely think they're holding you up",
          "It's a ritual phrase — the logic doesn't matter, the politeness does",
          "They want you to leave",
          "They're accusing you of staying too long"
        ],
        correct: 1,
        explanation: "'I won't keep you' is often said by the very person doing the keeping. The phrase is pure ritual — its literal meaning is irrelevant. It's a polite gesture toward ending, which then doesn't end."
      },
      {
        question: "You're at the door leaving. It starts raining. Your host says 'Ooh, it's coming down now. Wait till it stops?'",
        context: "You will be invited to wait until the rain stops. You will decline. You will then wait anyway.",
        options: [
          "They genuinely want you to stay another hour",
          "Ritual offer — you decline politely, then somehow stay anyway",
          "They're worried about your safety",
          "They want to keep talking about the weather"
        ],
        correct: 1,
        explanation: "The rain-delay offer is part of the choreography. The correct response is to decline ('Oh no, I'll be fine') — and then stay anyway, continuing to chat in the doorway. Both parties know the script."
      },
      {
        question: "You've driven off. In the mirror, your host is still standing there, waving. Why?",
        context: "They are still waving as you turn the corner.",
        options: [
          "They forgot to tell you something",
          "Sustained waving is the closing ceremony — drive slowly to honour it",
          "They want you to come back",
          "They're flagging down someone else"
        ],
        correct: 1,
        explanation: "The wave is not a single gesture — it's sustained until you're out of sight. The polite guest drives off slowly so the waving can continue properly. Turning the corner mid-wave is the only acceptable way to end it."
      },
      {
        question: "A British friend says 'Right, I really must be off' and then... doesn't move. What should you do?",
        context: "\"Right, I really must be off.\" You do not move.",
        options: [
          "Walk them to the door immediately",
          "Continue the conversation — 'must be off' means 'let's talk for 15 more minutes'",
          "Say goodbye and turn away",
          "Ask why they're not leaving"
        ],
        correct: 1,
        explanation: "'Right, I really must be off' is a conversational milestone, not an action. Said while standing still, it means the goodbye has entered its active phase — which involves more conversation, not less. Don't rush them out."
      }
    ],
    bgm_style: 'lofi',
    background_hint: 'british doorway front door evening goodbye'
  },

  'the-art-of-understatement': {
    id: 'the-art-of-understatement',
    title: 'The Art of Understatement',
    author: 'Readii Editorial',
    tag: 'Language',
    description: '"In Britain, \'not bad\' can mean anything from adequate to magnificent…"',
    estimated_minutes: 5,
    word_count: 264,
    audio_url: `${STORAGE_BASE}/article-audio/the-art-of-understatement.mp3`,
    full_text: `The British do not say what they mean. They say roughly the opposite, quietly, and trust you to work it out.\n\nThis is understatement, and it is the national art form.\n\nA surgeon may describe a six-hour operation as "a bit fiddly". A mountaineer, having nearly died, will report that conditions were "not ideal". If a British person tells you something is "not bad", they may mean it is the finest thing they have ever encountered. You cannot be sure. That is the point.\n\nThe scale runs in both directions, and it is treacherous.\n\n"Quite good" can mean genuinely good — or faintly disappointing. "Interesting" usually means I disagree. "I'm sure it's fine" means it is not fine. "With respect" means none is coming.\n\nThe most dangerous phrase is "a bit of a problem". This may describe a minor inconvenience, or a complete catastrophe in which the building is on fire. The words are identical. Only the eyebrows differ.\n\nForeigners struggle with this. Americans, in particular, find it maddening — they say what they mean and mean what they say, and they expect the same in return. In Britain, this is considered slightly vulgar.\n\nThe rule is: the bigger the feeling, the smaller the words.\n\nGreat joy is "rather nice". Devastation is "a shame". The best meal of your life is "quite tasty, actually".\n\nIt took me years to learn. Now, when something wonderful happens, I hear myself say "mustn't grumble".\n\nI mean it with my whole heart.`,
    segments: [
      { position: 1, audio_filename: 'the-art-of-understatement-01.mp3', text: "The British do not say what they mean. They say roughly the opposite, quietly, and trust you to work it out." },
      { position: 2, audio_filename: 'the-art-of-understatement-02.mp3', text: "This is understatement, and it is the national art form." },
      { position: 3, audio_filename: 'the-art-of-understatement-03.mp3', text: "A surgeon may describe a six-hour operation as \"a bit fiddly\"." },
      { position: 4, audio_filename: 'the-art-of-understatement-04.mp3', text: "A mountaineer, having nearly died, will report that conditions were \"not ideal\"." },
      { position: 5, audio_filename: 'the-art-of-understatement-05.mp3', text: "If a British person tells you something is \"not bad\", they may mean it is the finest thing they have ever encountered." },
      { position: 6, audio_filename: 'the-art-of-understatement-06.mp3', text: "You cannot be sure. That is the point." },
      { position: 7, audio_filename: 'the-art-of-understatement-07.mp3', text: "The scale runs in both directions, and it is treacherous." },
      { position: 8, audio_filename: 'the-art-of-understatement-08.mp3', text: "\"Quite good\" can mean genuinely good — or faintly disappointing. \"Interesting\" usually means I disagree." },
      { position: 9, audio_filename: 'the-art-of-understatement-09.mp3', text: "\"I'm sure it's fine\" means it is not fine. \"With respect\" means none is coming." },
      { position: 10, audio_filename: 'the-art-of-understatement-10.mp3', text: "The most dangerous phrase is \"a bit of a problem\"." },
      { position: 11, audio_filename: 'the-art-of-understatement-11.mp3', text: "This may describe a minor inconvenience, or a complete catastrophe in which the building is on fire." },
      { position: 12, audio_filename: 'the-art-of-understatement-12.mp3', text: "The words are identical. Only the eyebrows differ." },
      { position: 13, audio_filename: 'the-art-of-understatement-13.mp3', text: "The rule is: the bigger the feeling, the smaller the words." },
      { position: 14, audio_filename: 'the-art-of-understatement-14.mp3', text: "Great joy is \"rather nice\". Devastation is \"a shame\". The best meal of your life is \"quite tasty, actually\"." },
      { position: 15, audio_filename: 'the-art-of-understatement-15.mp3', text: "It took me years to learn. Now, when something wonderful happens, I hear myself say \"mustn't grumble\"." },
      { position: 16, audio_filename: 'the-art-of-understatement-16.mp3', text: "I mean it with my whole heart." }
    ],
    drill_words: [
      { word: 'understatement', from_segment: 2, context_sentence: 'This is understatement', phonemes: 'UHN.D.UH.S.T.AY.T.M.UHNT', tip: "'un-duh-STATE-muhnt'. Stress on STATE.", body: "Five syllables — keep the rhythm even.", feature: 'long word stress' },
      { word: 'treacherous', from_segment: 7, context_sentence: 'and it is treacherous', phonemes: 'T.R.E.CH.UH.R.UHS', tip: "'TRECH-uh-ruhs'. Stress on first.", body: "'TRECH' like 'fetch', soft schwa endings.", feature: 'schwa endings' },
      { word: 'catastrophe', from_segment: 11, context_sentence: 'a complete catastrophe', phonemes: 'K.UH.T.A.S.T.R.UH.F.EE', tip: "'kuh-TAS-truh-fee'. Stress on TAS.", body: "Four syllables, ends in 'fee' not 'foe'.", feature: 'stress + ending' },
      { word: 'inconvenience', from_segment: 11, context_sentence: 'a minor inconvenience', phonemes: 'IN.K.UHN.V.EE.N.Y.UHNS', tip: "'in-kuhn-VEEN-yuhns'. Stress on VEEN.", body: "Five syllables — don't rush the middle.", feature: 'long word' },
      { word: 'vulgar', from_segment: 1, context_sentence: 'this is considered slightly vulgar', phonemes: 'V.UH.L.G.UH', tip: "'VUL-guh'. Non-rhotic ending.", body: "No hard R — British 'guh' not 'gar'.", feature: 'non-rhotic ending' },
      { word: 'grumble', from_segment: 15, context_sentence: "I hear myself say mustn't grumble", phonemes: 'G.R.UH.M.B.UHL', tip: "'GRUM-buhl'. Short U like 'cup'.", body: "Soft -ble ending, common British word.", feature: 'vowel sound' }
    ],
    decode_questions: [
      {
        question: "You cooked dinner for a British friend. They take a bite and say 'Not bad, actually.' How did they like it?",
        context: "If a British person tells you something is \"not bad\", they may mean it is the finest thing they have ever encountered.",
        options: [
          "It was mediocre — they're being polite",
          "Could be genuinely impressed — 'not bad' often means excellent",
          "They didn't like it",
          "They want more"
        ],
        correct: 1,
        explanation: "'Not bad, actually' — especially with 'actually' — is high praise in British. The understatement scale runs upward: the smaller the words, the bigger the feeling. They may have loved it. The flat delivery is the compliment."
      },
      {
        question: "In a meeting, your British colleague says 'That's an interesting idea.' What do they actually think?",
        context: "\"Interesting\" usually means I disagree.",
        options: [
          "They find your idea genuinely fascinating",
          "They disagree but are being polite about it",
          "They want you to explain more",
          "They're impressed"
        ],
        correct: 1,
        explanation: "'Interesting' in a British professional setting is rarely a compliment. It usually means 'I disagree' or 'I have serious doubts'. The more enthusiastic the tone, the more polite the disagreement. Tread carefully."
      },
      {
        question: "Your British boss says 'I'm sure it's fine' about your report. Should you relax?",
        context: "\"I'm sure it's fine\" means it is not fine.",
        options: [
          "Yes — they've approved it",
          "No — 'I'm sure it's fine' often means it is NOT fine",
          "They haven't read it",
          "They want praise"
        ],
        correct: 1,
        explanation: "'I'm sure it's fine' is a classic British hedge that often means the opposite. If they were truly happy, they'd say nothing or be specific. The reassurance itself is the warning. Go back and check your report."
      },
      {
        question: "An email opens with 'With all due respect...' What's coming next?",
        context: "\"With respect\" means none is coming.",
        options: [
          "A respectful, considerate point",
          "A polite-sounding but pointed disagreement or criticism",
          "A compliment",
          "An apology"
        ],
        correct: 1,
        explanation: "'With all due respect' is the British signal that no respect is, in fact, forthcoming. It's the velvet glove before the punch. What follows is usually a firm disagreement, dressed in courtesy."
      },
      {
        question: "A British colleague mentions 'a bit of a problem' with the project. How worried should you be?",
        context: "This may describe a minor inconvenience, or a complete catastrophe in which the building is on fire.",
        options: [
          "Not at all — 'a bit' means small",
          "Possibly very worried — 'a bit of a problem' can mean total disaster",
          "It's definitely minor",
          "They're exaggerating"
        ],
        correct: 1,
        explanation: "'A bit of a problem' is dangerously ambiguous. It can mean a tiny hiccup — or a five-alarm catastrophe. The words never change; only the eyebrows and tone reveal the truth. When in doubt, ask follow-up questions."
      }
    ],
    bgm_style: 'lofi',
    background_hint: 'british office understated conversation tea'
  },

  'sunday-afternoons': {
    id: 'sunday-afternoons',
    title: 'Sunday Afternoons',
    author: 'Readii Editorial',
    tag: 'Reflection',
    description: '"There is a particular quiet to a British Sunday afternoon. It sounds like nothing happening…"',
    estimated_minutes: 5,
    word_count: 255,
    audio_url: `${STORAGE_BASE}/article-audio/sunday-afternoons.mp3`,
    full_text: `There is a particular quiet to a British Sunday afternoon.\n\nIt is not silence, exactly. It is the sound of nothing much happening, and everyone being faintly content about it.\n\nThe shops, if open at all, close early. The streets empty. Somewhere, a lawnmower starts, runs for twenty minutes, and stops. A church bell, perhaps. The distant sound of a football match on a television two houses away.\n\nWhen I first arrived, I found Sundays unbearable. In the city I came from, Sunday was simply another day to do things — to shop, to work, to move. Here, the whole country seemed to pause, and I did not know what to do with the pause.\n\nI would walk for hours, looking for somewhere open, somewhere busy, somewhere that felt alive. I rarely found it. Just closed shutters, and the smell of someone's roast dinner, and the grey light that the British call "bright" if it is not actually raining.\n\nIt took me a long time to understand that the emptiness was the point.\n\nThe Sunday afternoon is for nothing. For a long lunch that drifts into the evening. For a walk with no destination. For falling asleep in a chair with a book on your chest. For the radio murmuring in another room.\n\nNow, on Sunday afternoons, I do nothing, beautifully.\n\nI have learned the rarest British skill of all: how to be still, in the grey light, and call it a good day.`,
    segments: [
      { position: 1, audio_filename: 'sunday-afternoons-01.mp3', text: "There is a particular quiet to a British Sunday afternoon." },
      { position: 2, audio_filename: 'sunday-afternoons-02.mp3', text: "It is not silence, exactly. It is the sound of nothing much happening, and everyone being faintly content about it." },
      { position: 3, audio_filename: 'sunday-afternoons-03.mp3', text: "The shops, if open at all, close early. The streets empty." },
      { position: 4, audio_filename: 'sunday-afternoons-04.mp3', text: "Somewhere, a lawnmower starts, runs for twenty minutes, and stops. A church bell, perhaps." },
      { position: 5, audio_filename: 'sunday-afternoons-05.mp3', text: "The distant sound of a football match on a television two houses away." },
      { position: 6, audio_filename: 'sunday-afternoons-06.mp3', text: "When I first arrived, I found Sundays unbearable." },
      { position: 7, audio_filename: 'sunday-afternoons-07.mp3', text: "In the city I came from, Sunday was simply another day to do things — to shop, to work, to move." },
      { position: 8, audio_filename: 'sunday-afternoons-08.mp3', text: "Here, the whole country seemed to pause, and I did not know what to do with the pause." },
      { position: 9, audio_filename: 'sunday-afternoons-09.mp3', text: "I would walk for hours, looking for somewhere open, somewhere busy, somewhere that felt alive." },
      { position: 10, audio_filename: 'sunday-afternoons-10.mp3', text: "I rarely found it. Just closed shutters, and the smell of someone's roast dinner." },
      { position: 11, audio_filename: 'sunday-afternoons-11.mp3', text: "And the grey light that the British call \"bright\" if it is not actually raining." },
      { position: 12, audio_filename: 'sunday-afternoons-12.mp3', text: "It took me a long time to understand that the emptiness was the point." },
      { position: 13, audio_filename: 'sunday-afternoons-13.mp3', text: "The Sunday afternoon is for nothing. For a long lunch that drifts into the evening. For a walk with no destination." },
      { position: 14, audio_filename: 'sunday-afternoons-14.mp3', text: "For falling asleep in a chair with a book on your chest. For the radio murmuring in another room." },
      { position: 15, audio_filename: 'sunday-afternoons-15.mp3', text: "Now, on Sunday afternoons, I do nothing, beautifully." },
      { position: 16, audio_filename: 'sunday-afternoons-16.mp3', text: "I have learned the rarest British skill of all: how to be still, in the grey light, and call it a good day." }
    ],
    drill_words: [
      { word: 'particular', from_segment: 1, context_sentence: 'a particular quiet', phonemes: 'P.UH.T.I.K.Y.UH.L.UH', tip: "'puh-TIK-yuh-luh'. Stress on TIK.", body: "Four syllables, non-rhotic ending.", feature: 'non-rhotic ending' },
      { word: 'faintly', from_segment: 2, context_sentence: 'everyone being faintly content', phonemes: 'F.AY.N.T.L.EE', tip: "'FAYNT-lee'. Long AY at start.", body: "Soft T before -ly.", feature: 'long vowel' },
      { word: 'lawnmower', from_segment: 4, context_sentence: 'a lawnmower starts', phonemes: 'L.OR.N.M.OH.UH', tip: "'LORN-moh-uh'. Compound word.", body: "British 'lawn' = 'lorn', non-rhotic.", feature: 'compound word' },
      { word: 'unbearable', from_segment: 6, context_sentence: 'I found Sundays unbearable', phonemes: 'UHN.B.AIR.UH.B.UHL', tip: "'un-BAIR-uh-buhl'. Stress on BAIR.", body: "Four syllables, soft ending.", feature: 'stress pattern' },
      { word: 'destination', from_segment: 13, context_sentence: 'a walk with no destination', phonemes: 'D.E.S.T.I.N.AY.SH.UHN', tip: "'des-ti-NAY-shun'. Stress on NAY.", body: "Four syllables, even rhythm.", feature: 'stress pattern' },
      { word: 'murmuring', from_segment: 14, context_sentence: 'the radio murmuring', phonemes: 'M.UH.M.UH.R.ING', tip: "'MUR-muh-ring'. Both U's are schwa.", body: "Soft, gentle word — say it softly.", feature: 'schwa repetition' }
    ],
    decode_questions: [
      {
        question: "A British friend describes the weather as 'bright' but it's overcast and grey. What do they mean?",
        context: "the grey light that the British call \"bright\" if it is not actually raining.",
        options: [
          "It's genuinely sunny",
          "'Bright' just means 'not currently raining' — British optimism about grey skies",
          "They're being sarcastic",
          "They can't see properly"
        ],
        correct: 1,
        explanation: "In Britain, 'bright' is graded on a generous curve. If it isn't actively raining, the day qualifies as 'bright'. This is not delusion — it's a survival skill in a country where genuine sunshine is rationed."
      },
      {
        question: "You suggest going shopping on a British Sunday afternoon. Your friend looks uneasy. Why?",
        context: "The shops, if open at all, close early. The streets empty.",
        options: [
          "They don't like shopping",
          "Sunday is for stillness — the whole rhythm of the day resists 'doing things'",
          "They have no money",
          "Shops are always closed in Britain"
        ],
        correct: 1,
        explanation: "The British Sunday afternoon has a sacred slowness. Shops close early, streets empty, and there's a collective agreement to do very little. Suggesting busy activity slightly violates the unspoken rhythm of the day."
      },
      {
        question: "Your British host says 'Shall we just... not do much this afternoon?' Is something wrong?",
        context: "The Sunday afternoon is for nothing.",
        options: [
          "They're bored of your company",
          "No — 'doing nothing' on Sunday is a positive plan, even an invitation to intimacy",
          "They're tired and want you to leave",
          "They forgot to plan something"
        ],
        correct: 1,
        explanation: "'Let's not do much' is not a failure to plan — it IS the plan. The British Sunday afternoon celebrates gentle nothingness: long lunches, aimless walks, dozing in chairs. Being invited to do nothing together is a quiet form of closeness."
      },
      {
        question: "Someone describes their perfect Sunday as 'falling asleep in a chair with a book.' What are they valuing?",
        context: "For falling asleep in a chair with a book on your chest.",
        options: [
          "Being lazy and unproductive",
          "The deep British art of restful stillness — a skill, not a failure",
          "Avoiding social contact",
          "Not having enough to do"
        ],
        correct: 1,
        explanation: "Dozing off mid-book on a Sunday isn't laziness in British culture — it's a small triumph. The ability to be still, to rest without guilt, is considered a hard-won skill. The book on the chest is almost a badge of honour."
      },
      {
        question: "After years in Britain, the writer says 'I do nothing, beautifully.' What changed?",
        context: "Now, on Sunday afternoons, I do nothing, beautifully.",
        options: [
          "They became lazy",
          "They learned to value stillness rather than fearing emptiness",
          "They ran out of things to do",
          "They gave up on life"
        ],
        correct: 1,
        explanation: "The transformation is from anxiety to peace. Where the writer once found Sunday emptiness 'unbearable' and walked for hours seeking activity, they now embrace stillness as a quiet pleasure. 'Doing nothing, beautifully' is the arrival, not the surrender."
      }
    ],
    bgm_style: 'classical',
    background_hint: 'quiet british sunday afternoon grey light empty street'
  }
};

// Article golden quotes (for video output)
const ARTICLE_QUOTES = {
  'apology': 'And honestly? I rather like it.',
  'seven-novembers': 'Not too bad, thanks. And meant it.',
  'shop-closes-for-lunch': 'Long may it close for lunch.',
  'the-queue': 'I will wait, so that you may wait. I have come to find it beautiful.',
  'talking-about-weather': "Miserable, isn't it? — Always is.",
  'the-tea-question': "I'll put the kettle on. — Somewhere to put our hands.",
  'saying-goodbye': "We said goodbye for thirty-five minutes. We had a lovely time.",
  'the-art-of-understatement': "Mustn't grumble. — I mean it with my whole heart.",
  'sunday-afternoons': "I do nothing, beautifully. — How to be still, and call it a good day."
};

// ═════════════════════════════════════════════════════════════════════
// UMD-lite:浏览器挂全局,Node CommonJS export
// 不引入 webpack / ES modules,保持简单
// ═════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.ARTICLES_DATA = ARTICLES_DATA;
  window.ARTICLE_QUOTES = ARTICLE_QUOTES;
  window.STORAGE_BASE = STORAGE_BASE;
  window.SUPABASE_PROJECT_REF = SUPABASE_PROJECT_REF;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ARTICLES_DATA, ARTICLE_QUOTES, STORAGE_BASE, SUPABASE_PROJECT_REF };
}
