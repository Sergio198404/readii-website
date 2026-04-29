-- Migration: UK Culture Programme progress tracking
-- Date: 2026-04-30 (v2.2.0)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS uk_culture_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,   -- 'email' | 'meeting' | 'education' | 'daily' | 'setup'
  level_num INT NOT NULL,    -- 1-5
  sentence_idx INT NOT NULL, -- 0-9
  score INT NOT NULL,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_culture_progress_unique
  ON uk_culture_progress(user_id, module_id, level_num, sentence_idx);

CREATE INDEX IF NOT EXISTS uk_culture_progress_user_module
  ON uk_culture_progress(user_id, module_id, level_num);

ALTER TABLE uk_culture_progress ENABLE ROW LEVEL SECURITY;

-- DROP-then-CREATE pattern (avoids 42710 "already exists" error on re-runs)
DROP POLICY IF EXISTS "Users read own uk culture progress" ON uk_culture_progress;
CREATE POLICY "Users read own uk culture progress"
  ON uk_culture_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own uk culture progress" ON uk_culture_progress;
CREATE POLICY "Users insert own uk culture progress"
  ON uk_culture_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own uk culture progress" ON uk_culture_progress;
CREATE POLICY "Users update own uk culture progress"
  ON uk_culture_progress FOR UPDATE USING (auth.uid() = user_id);
