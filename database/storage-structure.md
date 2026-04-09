# Supabase Storage 文件结构

## Bucket: readii-content（私有，需登录才能访问）

books/
├── {book_id}/
│   ├── cover.jpg              -- 封面图
│   ├── book.pdf               -- 电子书 PDF
│   ├── day-1-reading.mp3      -- 第1天阅读音频
│   ├── day-1-commentary.mp3   -- 第1天讲解音频
│   ├── day-2-reading.mp3      -- 第2天阅读音频（如有）
│   ├── day-2-commentary.mp3   -- 第2天讲解音频（如有）
│   ├── day-3-reading.mp3      -- 第3天（如有）
│   ├── day-3-commentary.mp3
│   ├── day-4-reading.mp3      -- 第4天（如有）
│   └── day-4-commentary.mp3

vocab/
└── {word_id}/
    └── pronunciation.mp3      -- 单词发音（可选）
