#!/usr/bin/env node
/**
 * One-off provisioning script: reviewer demo account on production Supabase.
 *
 * Creates (or refreshes) a single user account at reviewer@readii.co.uk with
 * 30 days of realistic seeded activity across pronunciation_attempts,
 * progress, streaks, user_daily_book, uk_culture_progress, review_queue,
 * and user_word_favorites — for UK endorsing-body platform review.
 *
 * Idempotent: re-running detects the existing auth user, wipes their seeded
 * activity rows, and re-inserts fresh data with a new password. The auth
 * user_id stays the same so external references remain valid.
 *
 * Usage:
 *   node scripts/seed-reviewer-account.js --dry-run   # plan only, no writes
 *   node scripts/seed-reviewer-account.js             # execute against prod
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_KEY from .env at repo root.
 * Prints credentials to stdout on success — do NOT commit them.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FATAL: .env missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const REVIEWER_EMAIL_PRIMARY = 'reviewer@readii.co.uk';
const REVIEWER_EMAIL_FALLBACK = 'demo.reviewer@readii.co.uk';
const DISPLAY_NAME = 'reviewer';
const READING_LEVEL = 2;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─────────────────────── helpers ───────────────────────
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

function generatePassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  // Bias toward 1+ upper, 1+ lower, 1+ digit
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  let pwd = pick(upper) + pick(lower) + pick(digits);
  while (pwd.length < length) {
    pwd += alphabet[crypto.randomInt(alphabet.length)];
  }
  return shuffle(pwd.split('')).join('');
}

const now = new Date();
const daysAgo = (n, hourOffset = null) => {
  const d = new Date(now.getTime() - n * 86400000);
  if (hourOffset !== null) {
    d.setHours(hourOffset, rndInt(0, 59), rndInt(0, 59), 0);
  }
  return d;
};

// ─────────────────────── data: voice coach sentences ───────────────────────
// Mirrors VOICE_COACH_MODULES in index.html so the seeded `sentence` field
// matches sentences the user could realistically have practised.
const VC_SENTENCES = {
  broad_a: [
    "I can't dance after a long bath.",
    "The class went past the castle in France.",
    "My aunt asks for half a glass of water.",
    "The path is rather grand, isn't it?",
    "She laughed so hard she gasped for breath.",
    "Father can't pass the answer to the staff.",
  ],
  non_rhotic_r: [
    "The driver parked the car near the garden.",
    "My sister is a clever painter and writer.",
    "The water in the river is warmer than the harbour.",
    "Mother's favourite colour is darker than amber.",
    "The teacher's daughter studies further at university.",
    "Better weather brings a charmer of a summer.",
  ],
  th_voiced: [
    "They thought the weather would be clearer than this.",
    "My mother and father are travelling together this Thursday.",
    "Either path leads to the other side of the heath.",
    "Whether they gather here or there, brothers always bother each other.",
    "Smoothly, the leather soothes through her clothing.",
    "Although the feathers are rather thin, they breathe with rhythm.",
  ],
  yod: [
    "The new student studies a tune on Tuesday.",
    "The duke's nephew has a stupendous attitude.",
    "A few news reports dispute the suit of the duke.",
    "My tutor took a tube to the institute on duty.",
    "Beautiful music absolutely suits the mood.",
    "The nuclear unit produces enormous opportunity.",
  ],
  short_o: [
    "The dog got a lot of hot chocolate on top of the box.",
    "Tom forgot his job involves a long walk to the office.",
    "Bob's coffee shop is on the spot opposite the fox.",
    "Polly bought a soft cotton frock from the shop.",
    "Don dropped a rock on the lock of the locker.",
    "The pond beyond the cottage was lost in fog.",
  ],
};

// Module score profiles per brief
const VC_PLAN = {
  broad_a:     { count: 50, scoreMin: 60, scoreMax: 100, trend: 'up',     forcePerfect: 4, bestTarget: 100 },
  non_rhotic_r:{ count: 35, scoreMin: 50, scoreMax: 92,  trend: 'flat',   forcePerfect: 0, bestTarget: 95  },
  th_voiced:   { count: 30, scoreMin: 45, scoreMax: 88,  trend: 'flat',   forcePerfect: 0, bestTarget: 90  },
  yod:         { count: 25, scoreMin: 55, scoreMax: 80,  trend: 'flat',   forcePerfect: 0, bestTarget: 85  },
  short_o:     { count: 15, scoreMin: 50, scoreMax: 75,  trend: 'flat',   forcePerfect: 0, bestTarget: 80  },
};
const READING_ATTEMPT_COUNT = 20;

// ─────────────────────── core ───────────────────────
async function ensureAuthUser(password) {
  // Try primary email first
  for (const email of [REVIEWER_EMAIL_PRIMARY, REVIEWER_EMAIL_FALLBACK]) {
    // Page through existing users to detect collision
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
    const existing = list.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      console.log(`  ↻ Existing reviewer found: ${email} (id ${existing.id})`);
      const { error: upErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (upErr) throw new Error(`updateUserById failed: ${upErr.message}`);
      return { id: existing.id, email };
    }
    // No existing — try to create
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: DISPLAY_NAME },
    });
    if (createErr) {
      console.warn(`  ⚠️ createUser(${email}) failed: ${createErr.message}`);
      continue; // try fallback email
    }
    console.log(`  + Created new reviewer: ${email} (id ${created.user.id})`);
    return { id: created.user.id, email };
  }
  throw new Error('Could not create or find reviewer account on either email');
}

async function wipeSeededActivity(userId) {
  const tables = [
    'pronunciation_attempts',
    'review_queue',
    'user_word_favorites',
    'uk_culture_progress',
    'user_daily_book',
    'progress',
    'streaks',
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().eq('user_id', userId);
    if (error) console.warn(`  ⚠️ wipe ${t}: ${error.message}`);
  }
}

async function upsertProfile(userId) {
  // Reviewer needs 'active' subscription so books unlock for direct reading
  // (Library access gate in assets/js/library.js checks subscription_status
  // === 'active'). 1-year window is generous for review cycles
  const today = new Date();
  const oneYearLater = new Date(today.getTime() + 365 * 86400000);
  const { error } = await supabase.from('user_profiles').upsert({
    id: userId,
    display_name: DISPLAY_NAME,
    child_name: null,
    child_age: null,
    subscription_status: 'active',
    subscription_start: today.toISOString().slice(0, 10),
    subscription_end: oneYearLater.toISOString().slice(0, 10),
    reading_level: READING_LEVEL,
    books_read_count: 6,
  }, { onConflict: 'id' });
  if (error) throw new Error(`user_profiles upsert: ${error.message}`);
}

// Build attempt rows for a Voice Coach module
function buildVcAttempts(moduleId, plan) {
  const sentences = VC_SENTENCES[moduleId];
  const rows = [];
  // Cluster into sessions of 3-8 attempts within a 10-20 minute window
  let remaining = plan.count;
  while (remaining > 0) {
    const sessionSize = Math.min(remaining, rndInt(3, 8));
    const dayOffset = rndInt(0, 29);
    // Trend: 'up' = recent days score higher
    const recencyFactor = plan.trend === 'up'
      ? Math.max(0, (29 - dayOffset) / 29)  // 0..1, higher = more recent
      : 0.5;
    const baseTime = daysAgo(dayOffset, rndInt(8, 21));
    for (let i = 0; i < sessionSize; i++) {
      const t = new Date(baseTime.getTime() + i * rndInt(60, 180) * 1000);
      let score;
      if (plan.trend === 'up') {
        // Linear interpolate from min-edge to max-edge based on recency
        const lo = plan.scoreMin + (plan.scoreMax - plan.scoreMin) * 0.3 * (1 - recencyFactor);
        const hi = plan.scoreMin + (plan.scoreMax - plan.scoreMin) * (0.5 + 0.5 * recencyFactor);
        score = Math.round(lo + Math.random() * (hi - lo));
      } else {
        score = rndInt(plan.scoreMin, plan.scoreMax);
      }
      rows.push({
        user_id: null, // filled in by caller
        source: 'voice_coach',
        module_id: moduleId,
        sentence: pick(sentences),
        transcript: null,
        score,
        created_at: t.toISOString(),
      });
    }
    remaining -= sessionSize;
  }
  // Force at least N perfect-100s for Broad A
  if (plan.forcePerfect > 0) {
    for (let i = 0; i < plan.forcePerfect; i++) {
      rows[i].score = 100;
    }
  }
  // Force at least one attempt at the bestTarget if not already there
  const currentBest = Math.max(...rows.map(r => r.score));
  if (currentBest < plan.bestTarget) {
    rows[rows.length - 1].score = plan.bestTarget;
  }
  return rows;
}

function buildReadingAttempts(lessons) {
  // Pick 4-5 lessons, distribute ~20 attempts across them
  const chosen = shuffle(lessons).slice(0, 5);
  const rows = [];
  let remaining = READING_ATTEMPT_COUNT;
  for (const ls of chosen) {
    const cnt = Math.min(remaining, rndInt(3, 5));
    const dayOffset = rndInt(0, 25);
    const baseTime = daysAgo(dayOffset, rndInt(9, 20));
    for (let i = 0; i < cnt; i++) {
      const t = new Date(baseTime.getTime() + i * rndInt(45, 120) * 1000);
      rows.push({
        user_id: null,
        source: 'reading',
        module_id: ls.book_id,  // reading uses book_id as module_id (per index.html convention)
        sentence: 'Practice sentence from lesson commentary.',
        transcript: null,
        score: rndInt(70, 100),
        created_at: t.toISOString(),
      });
      remaining -= 1;
      if (remaining <= 0) break;
    }
    if (remaining <= 0) break;
  }
  return rows;
}

async function seedPronunciationAttempts(userId) {
  // Need lessons for the reading-source attempts
  const { data: lessons, error: lerr } = await supabase
    .from('lessons')
    .select('id, book_id')
    .limit(50);
  if (lerr) throw new Error(`lessons fetch: ${lerr.message}`);
  const lessonsForReading = (lessons || []).slice(0, 8);

  let allRows = [];
  for (const [moduleId, plan] of Object.entries(VC_PLAN)) {
    allRows = allRows.concat(buildVcAttempts(moduleId, plan));
  }
  if (lessonsForReading.length > 0) {
    allRows = allRows.concat(buildReadingAttempts(lessonsForReading));
  }
  // Stamp user_id
  allRows.forEach(r => { r.user_id = userId; });

  // Insert in chunks (Supabase has a row-count limit per request)
  const CHUNK = 200;
  for (let i = 0; i < allRows.length; i += CHUNK) {
    const slice = allRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('pronunciation_attempts').insert(slice);
    if (error) throw new Error(`pronunciation_attempts insert (chunk ${i}): ${error.message}`);
  }
  return allRows.length;
}

async function seedDailyBookAndProgress(userId) {
  // Fetch published books across multiple series + levels
  const { data: books, error: berr } = await supabase
    .from('books')
    .select('id, title, series, level, total_days')
    .eq('is_published', true)
    .limit(200);
  if (berr) throw new Error(`books fetch: ${berr.message}`);
  if (!books || books.length === 0) throw new Error('no published books found');

  // Pick 6 books mixed across series. The actual `series` strings in the DB
  // are like 'Heinemann GK' / 'Heinemann G1' / 'History' / 'Science' — match
  // by case-insensitive substring rather than exact uppercase keys.
  const seriesOf = (b) => (b.series || 'Other').toLowerCase();
  const matches = (b, needle) => seriesOf(b).includes(needle);
  const wantNeedles = ['gk', 'g1', 'g2', 'history', 'science'];
  const chosen = [];
  const claimed = new Set();
  for (const needle of wantNeedles) {
    const pool = books.filter(b => matches(b, needle) && !claimed.has(b.id));
    const take = shuffle(pool).slice(0, 2);
    for (const b of take) { chosen.push(b); claimed.add(b.id); }
    if (chosen.length >= 6) break;
  }
  if (chosen.length < 6) {
    // Top-up with any remaining books to reach 6
    const remaining = books.filter(b => !claimed.has(b.id));
    chosen.push(...shuffle(remaining).slice(0, 6 - chosen.length));
  }
  const bookSelection = chosen.slice(0, 6);
  const distinctSeries = [...new Set(bookSelection.map(b => b.series))];
  const distinctLevels = [...new Set(bookSelection.map(b => b.level))].sort();
  console.log(`  → Picked ${bookSelection.length} books across ${distinctSeries.length} series (${distinctSeries.join(', ')}), levels ${distinctLevels.join('/')}`);

  // user_daily_book: 5 completed days + today in-progress (current streak 4-5)
  // Pattern (relative to today):
  //   day 0 (today)  → book A, completed=false (in progress)
  //   day 1          → book B, completed=true, just_right
  //   day 2          → book C, completed=true, just_right
  //   day 3          → book D, completed=true, too_easy
  //   day 4          → book E, completed=true, just_right
  //   day 9          → book F, completed=true, just_right (gap = streak break)
  const dailyEntries = [
    { offset: 0, completed: false, fb: null },
    { offset: 1, completed: true,  fb: 'just_right' },
    { offset: 2, completed: true,  fb: 'just_right' },
    { offset: 3, completed: true,  fb: 'too_easy'   },
    { offset: 4, completed: true,  fb: 'just_right' },
    { offset: 9, completed: true,  fb: 'just_right' },
  ];
  const dailyRows = dailyEntries.map((e, i) => {
    const d = daysAgo(e.offset, rndInt(7, 21));
    return {
      user_id: userId,
      book_id: bookSelection[i % bookSelection.length].id,
      assigned_date: d.toISOString().slice(0, 10),
      completed: e.completed,
      difficulty_feedback: e.fb,
      created_at: d.toISOString(),
    };
  });
  const { error: dbErr } = await supabase.from('user_daily_book').insert(dailyRows);
  if (dbErr) throw new Error(`user_daily_book insert: ${dbErr.message}`);

  // progress: 14 in last 7 days + 6 earlier. Fetch a wider lesson pool than
  // just the 6 daily-book books — daily-book is the "one book per day"
  // adaptive flow; progress reflects any lesson the user has worked on,
  // so we want a broader sample to keep "Lessons this week: 14" hitting target
  const { data: lessons, error: lerr } = await supabase
    .from('lessons')
    .select('id, book_id, day_number')
    .limit(200);
  if (lerr) throw new Error(`lessons fetch: ${lerr.message}`);

  const lessonShuffled = shuffle(lessons || []);
  const totalProgress = Math.min(20, lessonShuffled.length);
  const progressRows = [];
  for (let i = 0; i < totalProgress; i++) {
    const ls = lessonShuffled[i];
    const offset = i < 14 ? rndInt(0, 6) : rndInt(8, 25);
    const t = daysAgo(offset, rndInt(8, 21));
    const readingDone = true;
    const commDone = Math.random() < 0.7;
    progressRows.push({
      user_id: userId,
      lesson_id: ls.id,
      reading_completed: readingDone,
      commentary_completed: commDone,
      reading_progress_seconds: rndInt(180, 380),
      commentary_progress_seconds: commDone ? rndInt(120, 280) : 0,
      pronunciation_score: rndInt(65, 95),
      completed_at: t.toISOString(),
      last_accessed: t.toISOString(),
    });
  }
  if (progressRows.length > 0) {
    const { error: pErr } = await supabase.from('progress').insert(progressRows);
    if (pErr) throw new Error(`progress insert: ${pErr.message}`);
  }

  return { books: bookSelection.length, lessonsCompleted: progressRows.length };
}

async function seedStreaks(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('streaks').insert({
    user_id: userId,
    current_streak: 4,
    longest_streak: 10,
    last_activity_date: today,
  });
  if (error) console.warn(`  ⚠️ streaks insert: ${error.message}`);
}

async function seedWordBankActivity(userId) {
  // Pull 12 words from word_bank (across modules so it looks varied)
  const { data: words, error: werr } = await supabase
    .from('word_bank')
    .select('id, word, ipa_gb, module_id')
    .limit(80);
  if (werr) throw new Error(`word_bank fetch: ${werr.message}`);
  if (!words || words.length === 0) {
    console.warn('  ⚠️ word_bank empty — skipping favorites/review seeding');
    return { mastered: 0, review: 0 };
  }
  const shuffled = shuffle(words);

  // Mastered = 6 favorites
  const mastered = shuffled.slice(0, 6);
  const favRows = mastered.map(w => ({ user_id: userId, word_id: w.id }));
  const { error: fErr } = await supabase.from('user_word_favorites').insert(favRows);
  if (fErr) console.warn(`  ⚠️ user_word_favorites: ${fErr.message}`);

  // Review queue = 3 words with low best_score (under 60), added within the
  // past 14 days
  const reviewWords = shuffled.slice(6, 9);
  const reviewRows = reviewWords.map(w => {
    const offset = rndInt(2, 14);
    const addedAt = daysAgo(offset, rndInt(10, 20));
    return {
      user_id: userId,
      word_id: w.id,
      added_at: addedAt.toISOString(),
      best_score_since_added: rndInt(35, 55),
    };
  });
  const { error: rErr } = await supabase.from('review_queue').insert(reviewRows);
  if (rErr) console.warn(`  ⚠️ review_queue: ${rErr.message}`);

  // Also seed 2-3 word_bank pronunciation attempts at the low scores
  // matching what put them in review (so the trend chart picks them up)
  const wbAttemptRows = [];
  for (const w of reviewWords) {
    const offset = rndInt(2, 14);
    const t = daysAgo(offset, rndInt(10, 20));
    wbAttemptRows.push({
      user_id: userId,
      source: 'word_bank',
      module_id: w.module_id,
      sentence: w.word,
      transcript: null,
      score: rndInt(35, 55),
      created_at: t.toISOString(),
    });
  }
  // Mastered words also get a couple of high-score attempts
  for (const w of mastered.slice(0, 4)) {
    const offset = rndInt(0, 10);
    const t = daysAgo(offset, rndInt(10, 20));
    wbAttemptRows.push({
      user_id: userId,
      source: 'word_bank',
      module_id: w.module_id,
      sentence: w.word,
      transcript: null,
      score: rndInt(82, 96),
      created_at: t.toISOString(),
    });
  }
  if (wbAttemptRows.length > 0) {
    const { error: aErr } = await supabase.from('pronunciation_attempts').insert(wbAttemptRows);
    if (aErr) console.warn(`  ⚠️ word_bank attempts: ${aErr.message}`);
  }

  return { mastered: mastered.length, review: reviewWords.length };
}

async function seedUkCulture(userId) {
  // Per brief:
  // - Business Meeting English (meeting): 1/50 sentences, avg 100, 1/5 levels unlocked
  // - Professional Email Writing (email): 7/50 sentences, avg 98, 1/5 levels unlocked
  // - Setup & Establishment Level 3 (setup l3): 8/10 sentences, scores 86-100
  const rows = [];

  // meeting l1: 1 sentence at 100
  rows.push({
    user_id: userId,
    module_id: 'meeting',
    level_num: 1,
    sentence_idx: 0,
    score: 100,
    transcript: null,
    created_at: daysAgo(rndInt(2, 14), rndInt(10, 18)).toISOString(),
  });

  // email l1: 7 sentences avg ~98
  const emailScores = [100, 100, 98, 100, 95, 96, 100]; // avg ≈ 98.4
  for (let i = 0; i < 7; i++) {
    rows.push({
      user_id: userId,
      module_id: 'email',
      level_num: 1,
      sentence_idx: i,
      score: emailScores[i],
      transcript: null,
      created_at: daysAgo(rndInt(1, 18), rndInt(9, 21)).toISOString(),
    });
  }

  // setup l3: 8 sentences scores 86-100
  const setupScores = [88, 92, 86, 100, 95, 90, 99, 91];
  for (let i = 0; i < 8; i++) {
    rows.push({
      user_id: userId,
      module_id: 'setup',
      level_num: 3,
      sentence_idx: i,
      score: setupScores[i],
      transcript: null,
      created_at: daysAgo(rndInt(1, 12), rndInt(9, 21)).toISOString(),
    });
  }

  const { error } = await supabase.from('uk_culture_progress').insert(rows);
  if (error) throw new Error(`uk_culture_progress insert: ${error.message}`);

  // Also mirror these to pronunciation_attempts (per index.html dual-write
  // pattern in v2.2.0 — UK Culture writes both tables so My Progress sees
  // them under source='uk_culture')
  const attemptRows = rows.map(r => ({
    user_id: userId,
    source: 'uk_culture',
    module_id: `${r.module_id}_l${r.level_num}`,
    sentence: `UK Culture · ${r.module_id} L${r.level_num} · sentence ${r.sentence_idx + 1}`,
    transcript: null,
    score: r.score,
    created_at: r.created_at,
  }));
  const { error: aErr } = await supabase.from('pronunciation_attempts').insert(attemptRows);
  if (aErr) console.warn(`  ⚠️ uk_culture pronunciation_attempts mirror: ${aErr.message}`);

  return rows.length;
}

// ─────────────────────── main ───────────────────────
async function main() {
  console.log('═══ Reviewer Demo Account Provisioning ═══');
  console.log(`Mode:     ${DRY_RUN ? 'DRY-RUN (no writes)' : 'PRODUCTION WRITE'}`);
  console.log(`Endpoint: ${SUPABASE_URL}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN PLAN ---');
    console.log('Would create or update:');
    console.log(`  • auth user: ${REVIEWER_EMAIL_PRIMARY} (or fallback)`);
    console.log(`  • user_profiles: display_name=${DISPLAY_NAME}, reading_level=${READING_LEVEL}, books_read_count=6`);
    console.log(`  • streaks: current=4, longest=10`);
    console.log(`  • user_daily_book: 6 entries (5 completed, today in-progress)`);
    console.log(`  • progress: 20 lessons (14 in last 7d, 6 earlier)`);
    console.log('  • pronunciation_attempts:');
    let totalAttempts = 0;
    for (const [m, p] of Object.entries(VC_PLAN)) {
      console.log(`      voice_coach/${m}: ${p.count} attempts (${p.scoreMin}-${p.scoreMax}, trend=${p.trend}, target best=${p.bestTarget})`);
      totalAttempts += p.count;
    }
    console.log(`      reading: ${READING_ATTEMPT_COUNT} attempts across ~5 lessons (70-100)`);
    console.log(`      word_bank: 7 attempts (3 low, 4 high)`);
    console.log(`      uk_culture: 16 attempts mirrored from uk_culture_progress`);
    totalAttempts += READING_ATTEMPT_COUNT + 7 + 16;
    console.log(`      ─── TOTAL: ~${totalAttempts} attempts spread across last 30 days`);
    console.log('  • user_word_favorites: 6 mastered words');
    console.log('  • review_queue: 3 words (best_score 35-55)');
    console.log('  • uk_culture_progress: 16 entries (meeting l1: 1, email l1: 7, setup l3: 8)');
    console.log('\nDry-run complete. Re-run without --dry-run to execute.');
    return;
  }

  console.log('\n[1/8] Generating password and ensuring auth user...');
  const password = generatePassword(12);
  const { id: userId, email } = await ensureAuthUser(password);

  console.log('[2/8] Wiping any existing seeded activity for this user...');
  await wipeSeededActivity(userId);

  console.log('[3/8] Upserting user_profiles...');
  await upsertProfile(userId);

  console.log('[4/8] Seeding streaks...');
  await seedStreaks(userId);

  console.log('[5/8] Seeding daily-book + progress (across multiple series/levels)...');
  const { books: booksCount, lessonsCompleted } = await seedDailyBookAndProgress(userId);

  console.log('[6/8] Seeding voice_coach + reading pronunciation_attempts (~195 across 30 days)...');
  const totalAttempts = await seedPronunciationAttempts(userId);

  console.log('[7/8] Seeding word_bank favorites + review queue + word-level attempts...');
  const { mastered, review } = await seedWordBankActivity(userId);

  console.log('[8/8] Seeding uk_culture_progress (+ mirror to pronunciation_attempts)...');
  const ukcCount = await seedUkCulture(userId);

  console.log('\n═══ Reviewer Demo Account Provisioned ═══');
  console.log(`URL:                   https://readii.co.uk`);
  console.log(`Email:                 ${email}`);
  console.log(`Username:              ${DISPLAY_NAME}`);
  console.log(`Password:              ${password}`);
  console.log(`Reading Level:         Level ${READING_LEVEL}`);
  console.log(`Total seeded attempts: ${totalAttempts + 7 + ukcCount} (voice_coach + reading + word_bank + uk_culture)`);
  console.log(`Books in library:      ${booksCount} (lessons completed: ${lessonsCompleted})`);
  console.log(`Words mastered:        ${mastered}`);
  console.log(`Words in review:       ${review}`);
  console.log(`UK Culture entries:    ${ukcCount}`);
  console.log('═════════════════════════════════════════');
  console.log('\nNext: log in via private browser window and walk the verification checklist.');
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
