// data/quote-cards.js
// ═════════════════════════════════════════════════════════════════════
// Quote cards data per article(社交媒体素材源)。
//
// Schema:
//   QUOTE_CARDS[slug] = [{ card_index, type, english_phrase, phonetic_respelling, chinese_translation, cultural_note }]
//
// type:
//   'phrase'             — 标准 phrase card(main english + phonetic + chinese + cultural note)
//   'carousel-cover'     — 小红书图文第 1 页(中文反差钩子大字,phonetic 留白)
//   'phoneme-spotlight'  — Phoneme spotlight(单词大字 + phonetic boxed + 文化注 2 行)
//
// 加新文章 cards:在下方加 slug → array of cards。
//
// Loading:
//   Browser: <script src="/data/quote-cards.js"></script>
//   Node:    const { QUOTE_CARDS } = require('../data/quote-cards.js')
// ═════════════════════════════════════════════════════════════════════

const QUOTE_CARDS = {
  'the-long-wait': [
    {
      card_index: 1,
      type: 'phrase',
      english_phrase: "Your team is given to you — like a surname.",
      phonetic_respelling: "Yore teem iz GIV-uhn too yoo / like uh SUR-naym.",
      chinese_translation: "你的球队是给你的——像姓氏一样。",
      cultural_note: "英国人不选球队。球队从家里继承,或者由出生地决定,然后跟你一辈子。"
    },
    {
      card_index: 2,
      type: 'phrase',
      english_phrase: "a betrayal without a name",
      phonetic_respelling: "uh bih-TRAY-uhl with-OUT uh naym.",
      chinese_translation: "一种没有名字的背叛。",
      cultural_note: "换球队这件事,太重,连「背叛」这种词都不够形容它。"
    },
    {
      card_index: 3,
      type: 'phrase',
      english_phrase: "An Englishman may change his religion — but never his team.",
      phonetic_respelling: "An ING-glish-muhn may chaynj hiz ri-LIJ-uhn / but NEV-er hiz teem.",
      chinese_translation: "英国人可以换宗教,但永远不能换球队。",
      cultural_note: "球队比工作、政治、甚至信仰,都更接近英国人的身份内核。"
    },
    {
      card_index: 4,
      type: 'phrase',
      english_phrase: "Supporting a team is mostly about suffering.",
      phonetic_respelling: "suh-PORT-ing uh teem iz MOHST-lee uh-BOWT SUFF-er-ing.",
      chinese_translation: "支持一支球队,大部分时候是在「受苦」。",
      cultural_note: "熬过失败的赛季才是真球迷。只在赢的时候出现的人——叫 glory hunter。"
    },
    {
      card_index: 5,
      type: 'phrase',
      english_phrase: "What matters is that you were there for all of it.",
      phonetic_respelling: "Wot MAT-erz iz dhat yoo wer dhair / for ohl uhv it.",
      chinese_translation: "重要的是,这一切你都在场。",
      cultural_note: "胜利不是重点。陪着球队经历所有失败、错失、平庸——这才是真正的「你的球队」。"
    },
    {
      card_index: 6,
      type: 'phrase',
      english_phrase: "Not joy, exactly. Something deeper.",
      phonetic_respelling: "Not joy, ig-ZAK-lee. SUM-thing DEEP-er.",
      chinese_translation: "不完全是喜悦。是更深的东西。",
      cultural_note: "等了 22 年的眼泪,不是简单的快乐——是几十年的身份认同、共同记忆,终于一起被释放。"
    },
    {
      card_index: 7,
      type: 'carousel-cover',
      english_phrase: "He may change his religion. But never his team.",
      phonetic_respelling: null,
      chinese_translation: "他可以换宗教。但永远不能换球队。",
      cultural_note: "→ 滑动看英国人 22 年眼泪的完整故事"
    },
    {
      card_index: 8,
      type: 'phoneme-spotlight',
      english_phrase: "betrayal",
      phonetic_respelling: "B.I.T.R.AY.UHL",
      chinese_translation: "背叛",
      cultural_note: "重音在 TRAY。中间长 AY 音,结尾轻 -uhl。\n中文母语者最容易卡的:把它读成「BEE-tray-uhl」——错。"
    }
  ]
};

// UMD-lite:浏览器 window + Node CommonJS
if (typeof window !== 'undefined') {
  window.QUOTE_CARDS = QUOTE_CARDS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUOTE_CARDS };
}
