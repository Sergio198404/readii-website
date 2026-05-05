-- Migration: Personal Library — Phase 1 (schema + storage)
-- Date: 2026-05-05 (v2.6.0)
-- Run in Supabase SQL Editor
--
-- Scope: 4 new tables + RLS, pronunciation_attempts extension (reuses existing
-- `source` column; adds source_id + source_metadata only), user_profiles beta
-- access flag, 3 private storage buckets with per-user RLS.
--
-- NO frontend entry point shipped in this version. Routes /learn/personal-library/*
-- will gate on user_profiles.pl_beta_access. Default false. Operator UPDATE at
-- bottom of this file grants Kevin's account beta access for internal testing.


-- ═══════════════════════════════════════════════════════════════
-- 1. user_books — master record per user-uploaded book
-- ═══════════════════════════════════════════════════════════════
-- voucher_id FK is added LATER (after user_book_vouchers exists) to break the
-- circular reference. The column itself is declared here as plain UUID.
CREATE TABLE IF NOT EXISTS user_books (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  author                   TEXT,
  source_pdf_path          TEXT NOT NULL,                  -- Storage key in user-pdfs bucket
  total_pages              INT NOT NULL,
  total_words              INT NOT NULL,
  estimated_audio_seconds  INT NOT NULL,
  language_detected        TEXT DEFAULT 'en',
  voice_id                 TEXT NOT NULL CHECK (voice_id IN ('sonia','ryan','sonia-hd','ryan-hd')),
  daily_minutes            INT NOT NULL CHECK (daily_minutes IN (5,10,15,20,30)),
  total_days               INT NOT NULL,
  tier                     TEXT NOT NULL CHECK (tier IN ('short','medium','long','xlarge')),
  base_price_pence         INT NOT NULL,
  voice_premium_pence      INT NOT NULL DEFAULT 0,
  voucher_id               UUID,                            -- FK added below after user_book_vouchers exists
  voucher_discount_pence   INT NOT NULL DEFAULT 0,
  amount_paid_pence        INT NOT NULL DEFAULT 0,
  stripe_session_id        TEXT,
  stripe_payment_intent_id TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending_payment'
                              CHECK (status IN ('pending_payment','paid','processing','ready','in_progress','completed','failed','refunded')),
  failure_reason           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at                  TIMESTAMPTZ,
  processing_started_at    TIMESTAMPTZ,
  ready_at                 TIMESTAMPTZ,
  first_read_at            TIMESTAMPTZ,
  last_read_at             TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_books_user_id_idx ON user_books(user_id);
CREATE INDEX IF NOT EXISTS user_books_status_idx  ON user_books(status);

ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own books" ON user_books;
CREATE POLICY "Users see own books"
  ON user_books FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own books" ON user_books;
CREATE POLICY "Users insert own books"
  ON user_books FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own books" ON user_books;
CREATE POLICY "Users update own books"
  ON user_books FOR UPDATE USING (auth.uid() = user_id);
-- (Worker uses service role and bypasses RLS for status writes.)


-- ═══════════════════════════════════════════════════════════════
-- 2. user_book_chunks — per-day reading task
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_book_chunks (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id                   UUID NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number                INT NOT NULL,
  start_page                INT NOT NULL,
  end_page                  INT NOT NULL,
  start_char_offset         INT NOT NULL,
  end_char_offset           INT NOT NULL,
  word_count                INT NOT NULL,
  estimated_seconds         INT NOT NULL,
  text_content              TEXT NOT NULL,
  audio_path                TEXT,                                       -- Storage key in user-book-audio
  audio_duration_seconds    INT,
  vocabulary                JSONB,                                      -- [{word, ipa, chinese, example, position}]
  representative_sentences  JSONB,                                      -- [{sentence, position, target_phonemes:[]}]
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','generating','ready','failed')),
  audio_progress_seconds    INT DEFAULT 0,
  read_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, day_number)
);

CREATE INDEX IF NOT EXISTS user_book_chunks_book_idx ON user_book_chunks(book_id);
CREATE INDEX IF NOT EXISTS user_book_chunks_user_idx ON user_book_chunks(user_id);

ALTER TABLE user_book_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own chunks" ON user_book_chunks;
CREATE POLICY "Users see own chunks"
  ON user_book_chunks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own chunks progress" ON user_book_chunks;
CREATE POLICY "Users update own chunks progress"
  ON user_book_chunks FOR UPDATE USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- 3. user_book_vouchers — completion rewards
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_book_vouchers (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code                        TEXT NOT NULL UNIQUE,                   -- e.g. 'READ-A4F2-9KM3'
  amount_pence                INT NOT NULL,
  earned_from_book_id         UUID REFERENCES user_books(id),
  earned_from_completion_pct  INT NOT NULL,                           -- 80 or 100
  earned_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                  TIMESTAMPTZ NOT NULL,                   -- earned_at + 60 days
  applied_to_book_id          UUID REFERENCES user_books(id),
  applied_at                  TIMESTAMPTZ,
  status                      TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','applied','expired'))
);

CREATE INDEX IF NOT EXISTS user_book_vouchers_user_idx   ON user_book_vouchers(user_id);
CREATE INDEX IF NOT EXISTS user_book_vouchers_status_idx ON user_book_vouchers(status);

ALTER TABLE user_book_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own vouchers" ON user_book_vouchers;
CREATE POLICY "Users see own vouchers"
  ON user_book_vouchers FOR SELECT USING (auth.uid() = user_id);
-- Issuance / application are server-side via service role; no user-facing INSERT/UPDATE policies.


-- ═══════════════════════════════════════════════════════════════
-- 4. Close the circular FK: user_books.voucher_id → user_book_vouchers.id
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_books_voucher_id_fkey'
  ) THEN
    ALTER TABLE user_books
      ADD CONSTRAINT user_books_voucher_id_fkey
      FOREIGN KEY (voucher_id) REFERENCES user_book_vouchers(id);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 5. book_processing_jobs — worker queue (service role only)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS book_processing_jobs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id      UUID NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued','running','succeeded','failed')),
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT,
  enqueued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS book_processing_jobs_status_idx
  ON book_processing_jobs(status, enqueued_at);

ALTER TABLE book_processing_jobs ENABLE ROW LEVEL SECURITY;
-- No user-facing policies. Worker uses service role and bypasses RLS.


-- ═══════════════════════════════════════════════════════════════
-- 6. Extend pronunciation_attempts (REUSES existing `source` column)
-- ═══════════════════════════════════════════════════════════════
-- Existing `source` column already takes values 'voice_coach' | 'word_bank' |
-- 'uk_culture'. Personal Library writes 'personal_library'. No CHECK constraint
-- exists on this column today; we deliberately do NOT add one (would need to
-- back-fill validation across ~200 historical rows on the reviewer account).
-- Two genuinely new columns added here:
--   source_id        — points to user_book_chunks.id for personal_library rows
--   source_metadata  — {day_number, sentence_index, sentence_text} for personal_library rows
ALTER TABLE pronunciation_attempts
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB;

CREATE INDEX IF NOT EXISTS pronunciation_attempts_source_idx
  ON pronunciation_attempts(user_id, source, source_id);


-- ═══════════════════════════════════════════════════════════════
-- 7. user_profiles.pl_beta_access — Personal Library beta gate
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS pl_beta_access BOOLEAN NOT NULL DEFAULT false;


-- ═══════════════════════════════════════════════════════════════
-- 8. Storage buckets (private, signed-URL access only)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-pdfs',             'user-pdfs',             false, 52428800)   -- 50 MB
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-book-audio',       'user-book-audio',       false, 31457280)   -- 30 MB per chunk MP3
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-book-recordings',  'user-book-recordings',  false, 5242880)    -- 5 MB per recording
ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────
-- Storage RLS — path pattern '{user_id}/...' for all three buckets
-- ───────────────────────────────────────────────

-- user-pdfs: user reads/inserts own; worker writes via service role
DROP POLICY IF EXISTS "Users read own pdfs" ON storage.objects;
CREATE POLICY "Users read own pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users insert own pdfs" ON storage.objects;
CREATE POLICY "Users insert own pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own pdfs" ON storage.objects;
CREATE POLICY "Users delete own pdfs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- user-book-audio: user reads own (via signed URL); worker writes via service role
DROP POLICY IF EXISTS "Users read own book audio" ON storage.objects;
CREATE POLICY "Users read own book audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-book-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- user-book-recordings: user reads/inserts own; worker reads for scoring (service role)
DROP POLICY IF EXISTS "Users read own recordings" ON storage.objects;
CREATE POLICY "Users read own recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-book-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users insert own recordings" ON storage.objects;
CREATE POLICY "Users insert own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-book-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ═══════════════════════════════════════════════════════════════
-- 9. Grant beta access to operator (Kevin) for internal testing
-- ═══════════════════════════════════════════════════════════════
-- Idempotent: if the email's profile already has pl_beta_access=true, no-op.
-- Email comparison is case-insensitive.
UPDATE user_profiles
   SET pl_beta_access = true
 WHERE id = (
   SELECT id FROM auth.users
    WHERE lower(email) = lower('Kevin_SU2022@163.COM')
    LIMIT 1
 );


-- ═══════════════════════════════════════════════════════════════
-- Verification queries (run these after migration to sanity-check)
-- ═══════════════════════════════════════════════════════════════
-- SELECT tablename FROM pg_tables WHERE tablename IN
--   ('user_books','user_book_chunks','user_book_vouchers','book_processing_jobs');
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='pronunciation_attempts' AND column_name IN ('source','source_id','source_metadata');
-- SELECT id FROM storage.buckets WHERE id LIKE 'user-%';
-- SELECT u.email, p.pl_beta_access FROM user_profiles p JOIN auth.users u ON u.id=p.id WHERE p.pl_beta_access=true;
