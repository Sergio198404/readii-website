-- Migration: daily-book mode (v2.3.0)
-- Date: 2026-04-30
-- Run in Supabase SQL Editor

-- One-row-per-day book assignment per user
CREATE TABLE IF NOT EXISTS user_daily_book (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  difficulty_feedback TEXT CHECK (difficulty_feedback IN ('too_hard', 'just_right', 'too_easy')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, assigned_date)
);

ALTER TABLE user_daily_book ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own daily book" ON user_daily_book;
CREATE POLICY "Users read own daily book"
  ON user_daily_book FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own daily book" ON user_daily_book;
CREATE POLICY "Users insert own daily book"
  ON user_daily_book FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own daily book" ON user_daily_book;
CREATE POLICY "Users update own daily book"
  ON user_daily_book FOR UPDATE USING (auth.uid() = user_id);

-- Per-user adaptive level + lifetime book count
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS reading_level INT DEFAULT 1
    CHECK (reading_level BETWEEN 1 AND 3);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS books_read_count INT DEFAULT 0;
