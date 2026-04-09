-- ═══════════════════════════════
-- READII DATABASE SCHEMA v1.0.0
-- ═══════════════════════════════

-- 书籍表
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,                    -- 书名
  title_zh TEXT,                          -- 中文书名（可选）
  series TEXT,                            -- 系列，如 Heinemann / History / Science
  level INTEGER,                          -- 难度级别 1-10
  total_days INTEGER NOT NULL DEFAULT 1, -- 这本书分几天完成（1-4）
  cover_image_url TEXT,                  -- 封面图片 URL（Supabase Storage）
  pdf_url TEXT,                          -- 电子书 PDF URL（Supabase Storage）
  description TEXT,                      -- 简介
  description_zh TEXT,                   -- 中文简介
  age_min INTEGER,                       -- 建议最小年龄
  age_max INTEGER,                       -- 建议最大年龄
  is_published BOOLEAN DEFAULT false,    -- 是否上线
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 课节表（每本书按天拆分）
CREATE TABLE lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,           -- 第几天，1/2/3/4
  title TEXT,                            -- 课节标题，如 "Day 1 — Chapters 1-3"
  reading_audio_url TEXT,                -- 阅读音频 URL（老师朗读）
  commentary_audio_url TEXT,             -- 讲解音频 URL（老师点评/词汇讲解）
  reading_duration_seconds INTEGER,      -- 阅读音频时长（秒）
  commentary_duration_seconds INTEGER,   -- 讲解音频时长（秒）
  page_start INTEGER,                    -- 对应PDF第几页开始
  page_end INTEGER,                      -- 对应PDF第几页结束
  sort_order INTEGER NOT NULL,           -- 排序用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, day_number)
);

-- 词汇表
CREATE TABLE vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  word TEXT NOT NULL,                    -- 英文单词
  definition_en TEXT,                    -- 英文释义
  definition_zh TEXT,                    -- 中文释义
  part_of_speech TEXT,                   -- 词性 noun/verb/adjective 等
  audio_url TEXT,                        -- 单词发音音频
  example_sentence TEXT,                 -- 例句
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表（扩展 Supabase Auth）
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  child_name TEXT,                       -- 孩子名字
  child_age INTEGER,                     -- 孩子年龄
  subscription_status TEXT DEFAULT 'free', -- free / active / cancelled
  subscription_start DATE,
  subscription_end DATE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学习进度表
CREATE TABLE progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  reading_completed BOOLEAN DEFAULT false,
  commentary_completed BOOLEAN DEFAULT false,
  reading_progress_seconds INTEGER DEFAULT 0,   -- 听到第几秒
  commentary_progress_seconds INTEGER DEFAULT 0,
  pronunciation_score INTEGER,                   -- AI发音评分 0-100
  completed_at TIMESTAMPTZ,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- 学习连续天数（streak）
CREATE TABLE streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
