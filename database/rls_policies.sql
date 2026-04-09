-- ═══════════════════════════════
-- READII RLS POLICIES
-- 在 Supabase SQL Editor 中执行
-- ═══════════════════════════════

-- 启用 RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- 公开读取已发布的书籍（不需要登录）
CREATE POLICY "Anyone can read published books"
  ON books FOR SELECT
  USING (is_published = true);

-- 公开读取课节（关联已发布书籍）
CREATE POLICY "Anyone can read lessons of published books"
  ON lessons FOR SELECT
  USING (book_id IN (SELECT id FROM books WHERE is_published = true));

-- 公开读取词汇
CREATE POLICY "Anyone can read vocabulary"
  ON vocabulary FOR SELECT
  USING (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN books b ON l.book_id = b.id
    WHERE b.is_published = true
  ));

-- 用户只能读写自己的 profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 用户只能读写自己的进度
CREATE POLICY "Users can read own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户只能读写自己的 streak
CREATE POLICY "Users can read own streak"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own streak"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);
