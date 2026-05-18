#!/usr/bin/env node
/**
 * scripts/generate-article-audio.js
 *
 * Batch-generate Daisy article audio with ElevenLabs + upload to Supabase Storage.
 *
 * Pipeline per article:
 *   1. For each segment: ElevenLabs TTS → upload article-audio/{slug}-NN.mp3
 *   2. ffmpeg concat all segments → upload article-audio/{slug}.mp3  (full reading)
 *   3. For each drill word: TTS (word only) → upload word-audio/{word}.mp3
 *      (skip if word-audio/{word}.mp3 already exists — D1 dedup)
 *
 * Usage:
 *   node scripts/generate-article-audio.js --slug the-queue
 *   node scripts/generate-article-audio.js --all
 *   node scripts/generate-article-audio.js --slug the-queue --segment 1   # only seg #1, for voice test
 *   node scripts/generate-article-audio.js --slug the-queue --segments-only
 *   node scripts/generate-article-audio.js --slug the-queue --words-only
 *   node scripts/generate-article-audio.js --slug the-queue --dry-run     # plan only
 *
 * Required .env (at repo root):
 *   ELEVENLABS_API_KEY=sk_...
 *   SUPABASE_URL=https://...supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...
 *
 * Node version: 18+ (uses built-in fetch)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { ARTICLES_DATA } = require('../data/articles.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// ─────────────────────── env + config ───────────────────────
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('FATAL: .env missing ELEVENLABS_API_KEY');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FATAL: .env missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Daisy voice (Xiaoyu confirmed)
const VOICE_ID = 'DYAWdnlYLnZyj3yWpS75';
const MODEL_ID = 'eleven_v3';
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};
const OUTPUT_FORMAT = 'mp3_44100_128';

// ─────────────────────── argv ───────────────────────
const args = process.argv.slice(2);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const argHas = (flag) => args.includes(flag);

const slug = argVal('--slug');
const all = argHas('--all');
const dryRun = argHas('--dry-run');
const segmentsOnly = argHas('--segments-only');
const wordsOnly = argHas('--words-only');
const singleSegStr = argVal('--segment');
const singleSeg = singleSegStr !== null ? parseInt(singleSegStr) : null;

if (!all && !slug) {
  console.error('Usage:');
  console.error('  node scripts/generate-article-audio.js --slug <slug>');
  console.error('  node scripts/generate-article-audio.js --all');
  console.error('Options:');
  console.error('  --segment N      Only generate segment N (test mode)');
  console.error('  --segments-only  Skip drill words');
  console.error('  --words-only     Skip segments + concat');
  console.error('  --dry-run        Plan only, no API calls / uploads');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─────────────────────── helpers ───────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const truncate = (s, n = 60) =>
  s.length > n ? s.slice(0, n) + '…' : s;

// Normalise word for filename (matches quiz/index.html playWordAudio logic)
const wordToFilename = (word) =>
  String(word || '').toLowerCase().replace(/[^a-z']/g, '');

// ─────────────────────── ElevenLabs TTS ───────────────────────
async function tts(text, attempt = 1) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: VOICE_SETTINGS,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`ElevenLabs ${resp.status}: ${errText.slice(0, 300)}`);
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length < 100) {
      throw new Error(`Suspicious tiny response (${buffer.length} bytes)`);
    }
    return buffer;
  } catch (err) {
    if (attempt < 3) {
      const wait = Math.pow(2, attempt) * 1000; // 2s, 4s
      console.warn(`      ⚠ TTS attempt ${attempt} failed: ${err.message}`);
      console.warn(`      ↺ retrying in ${wait}ms...`);
      await sleep(wait);
      return tts(text, attempt + 1);
    }
    throw err;
  }
}

// ─────────────────────── Supabase Storage ───────────────────────
async function uploadToStorage(bucket, objectPath, buffer) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
  if (error) throw new Error(`Upload ${bucket}/${objectPath}: ${error.message}`);
}

async function existsInStorage(bucket, objectPath) {
  // list with search filter; match exact name
  const { data, error } = await supabase.storage
    .from(bucket)
    .list('', { search: objectPath, limit: 5 });
  if (error) return false;
  return Array.isArray(data) && data.some((f) => f.name === objectPath);
}

// ─────────────────────── ffmpeg concat ───────────────────────
async function concatMp3s(buffers) {
  const ffmpegPath = require('ffmpeg-static');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readii-concat-'));
  const listPath = path.join(tmpDir, 'list.txt');
  const outPath = path.join(tmpDir, 'concat.mp3');

  const inputPaths = buffers.map((buf, i) => {
    const p = path.join(tmpDir, `seg${String(i).padStart(2, '0')}.mp3`);
    fs.writeFileSync(p, buf);
    return p;
  });

  // ffmpeg concat-demuxer list file:
  //   file '/tmp/.../seg00.mp3'
  //   file '/tmp/.../seg01.mp3'
  const listContent = inputPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listPath, listContent);

  const cleanup = () => {
    inputPaths.forEach((p) => { try { fs.unlinkSync(p); } catch (e) {} });
    try { fs.unlinkSync(listPath); } catch (e) {}
    try { fs.unlinkSync(outPath); } catch (e) {}
    try { fs.rmdirSync(tmpDir); } catch (e) {}
  };

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy', // identical mp3 format — no re-encode
      outPath,
    ]);
    let stderr = '';
    ffmpeg.stderr.on('data', (d) => { stderr += d.toString(); });
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        cleanup();
        reject(new Error(`ffmpeg concat exit ${code}: ${stderr.slice(-500)}`));
        return;
      }
      try {
        const result = fs.readFileSync(outPath);
        cleanup();
        resolve(result);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
    ffmpeg.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

// ─────────────────────── per-article ───────────────────────
async function generateForArticle(article) {
  console.log(`\n📖 ${article.title}  (${article.id})`);
  console.log(`   Author: ${article.author}  ·  Segments: ${article.segments.length}  ·  Drill words: ${article.drill_words?.length || 0}`);

  if (dryRun) {
    console.log('   (dry-run — no API calls, no uploads)');
    return { segments: 0, words: 0, errors: 0 };
  }

  const stats = { segments: 0, words: 0, errors: 0 };
  const segmentBuffers = []; // for concat

  // ── Phase A: segments ──
  if (!wordsOnly) {
    for (const seg of article.segments) {
      if (singleSeg !== null && seg.position !== singleSeg) continue;

      const filename =
        seg.audio_filename ||
        `${article.id}-${String(seg.position).padStart(2, '0')}.mp3`;
      console.log(`   🔊 seg ${String(seg.position).padStart(2, '0')}: "${truncate(seg.text)}"`);

      try {
        const t0 = Date.now();
        const buf = await tts(seg.text);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`      → ${buf.length} bytes in ${elapsed}s`);
        await uploadToStorage('article-audio', filename, buf);
        console.log(`      ✓ uploaded article-audio/${filename}`);
        segmentBuffers.push(buf);
        stats.segments++;
      } catch (err) {
        console.error(`      ✗ seg ${seg.position} FAILED: ${err.message}`);
        stats.errors++;
      }
    }
  }

  // ── Phase B: full article = ffmpeg concat (only when all segs succeeded + no --segment flag) ──
  if (!wordsOnly && singleSeg === null && segmentBuffers.length === article.segments.length) {
    console.log(`   🧵 concatenating ${segmentBuffers.length} segments → ${article.id}.mp3`);
    try {
      const full = await concatMp3s(segmentBuffers);
      await uploadToStorage('article-audio', `${article.id}.mp3`, full);
      console.log(`      ✓ uploaded article-audio/${article.id}.mp3  (${full.length} bytes)`);
    } catch (err) {
      console.error(`      ✗ concat FAILED: ${err.message}`);
      stats.errors++;
    }
  } else if (!wordsOnly && singleSeg === null) {
    console.warn(`   ⚠ skip full concat — only ${segmentBuffers.length}/${article.segments.length} segments OK`);
  }

  // ── Phase C: drill words (D1 dedup) ──
  if (!segmentsOnly && singleSeg === null && Array.isArray(article.drill_words)) {
    for (const drill of article.drill_words) {
      const key = wordToFilename(drill.word);
      if (!key) {
        console.warn(`   ⚠ skip empty word: ${JSON.stringify(drill.word)}`);
        continue;
      }
      const filename = `${key}.mp3`;

      const exists = await existsInStorage('word-audio', filename);
      if (exists) {
        console.log(`   ⏭  word "${drill.word}" already in word-audio/, skip (D1 dedup)`);
        continue;
      }

      console.log(`   🔤 word: "${drill.word}"`);
      try {
        const t0 = Date.now();
        const buf = await tts(drill.word); // C1: word only (no example sentence)
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`      → ${buf.length} bytes in ${elapsed}s`);
        await uploadToStorage('word-audio', filename, buf);
        console.log(`      ✓ uploaded word-audio/${filename}`);
        stats.words++;
      } catch (err) {
        console.error(`      ✗ word "${drill.word}" FAILED: ${err.message}`);
        stats.errors++;
      }
    }
  }

  return stats;
}

// ─────────────────────── main ───────────────────────
(async () => {
  const targetSlugs = all ? Object.keys(ARTICLES_DATA) : [slug];

  console.log('╔══════════════════════════════════════════════════════════════════════');
  console.log('║ Readii Article Audio Generator');
  console.log(`║ Voice: ${VOICE_ID}  ·  Model: ${MODEL_ID}`);
  console.log(`║ Targets: ${targetSlugs.join(', ')}`);
  if (dryRun) console.log('║ Mode: DRY RUN');
  if (segmentsOnly) console.log('║ Mode: SEGMENTS ONLY (skip drill words)');
  if (wordsOnly) console.log('║ Mode: WORDS ONLY (skip segments + concat)');
  if (singleSeg !== null) console.log(`║ Mode: SINGLE SEGMENT (position ${singleSeg})`);
  console.log('╚══════════════════════════════════════════════════════════════════════');

  const totals = { segments: 0, words: 0, errors: 0 };

  for (const s of targetSlugs) {
    const article = ARTICLES_DATA[s];
    if (!article) {
      console.error(`✗ Article not found: ${s}`);
      totals.errors++;
      continue;
    }
    try {
      const stats = await generateForArticle(article);
      totals.segments += stats.segments;
      totals.words += stats.words;
      totals.errors += stats.errors;
    } catch (err) {
      console.error(`✗ Article ${s} fatal: ${err.message}`);
      totals.errors++;
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`✓ Done.  Segments: ${totals.segments}  Words: ${totals.words}  Errors: ${totals.errors}`);
  console.log('══════════════════════════════════════════════════════════════════════');

  process.exit(totals.errors > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
