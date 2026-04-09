#!/usr/bin/env node
/**
 * Readii Supabase Uploader
 * 读取扫描生成的 Excel，过滤文件齐全的书籍，上传到 Supabase Storage + 写入数据库
 *
 * Usage:
 *   node tools/upload_to_supabase.js --root "内容根目录" [--excel "tools/readii_content_import.xlsx"] [--dry-run]
 *
 * 前置条件：
 *   1. 在 Supabase Dashboard 执行 database/schema.sql 建表
 *   2. 在 Supabase Storage 创建 bucket: readii-content (private)
 *   3. 在 .env 填入 SUPABASE_SERVICE_KEY
 */

const fs = require('fs');
const path = require('path');

// ── 依赖检查 ──
let ExcelJS, dotenv;
try {
  ExcelJS = require('exceljs');
  dotenv = require('dotenv');
} catch {
  console.log('请先安装依赖: npm install exceljs dotenv @supabase/supabase-js');
  process.exit(1);
}

dotenv.config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('❌ 缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  console.log('   请检查 .env 文件');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = 'readii-content';

// ── MIME 类型 ──
function getMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png',
  };
  return map[ext] || 'application/octet-stream';
}

// ── 系列配置（与 scan_content.js 保持一致） ──
const SERIES_ROOTS = {
  GK: 'GK', G1: 'G1', G2: 'G2', history: 'history', US: 'US',
};

// ── 查找文件的真实路径 ──
function findFile(contentRoot, seriesKey, folderName, fileName) {
  if (!fileName) return null;

  // 如果是散文件（folder_name 以 [loose] 开头），文件在阶段文件夹根目录
  const isLoose = folderName.startsWith('[loose]');

  // 搜索所有可能的解压文件夹
  const entries = fs.readdirSync(contentRoot).filter(d => {
    return d.toUpperCase().startsWith(seriesKey.toUpperCase()) &&
           fs.statSync(path.join(contentRoot, d)).isDirectory();
  });

  for (const entry of entries) {
    const base = path.join(contentRoot, entry);
    const inner = path.join(base, seriesKey);
    const seriesDir = fs.existsSync(inner) ? inner : base;

    if (isLoose) {
      // 散文件：在阶段文件夹或系列根目录
      const phase = folderName.replace('[loose] ', '');
      const candidates = [
        path.join(seriesDir, phase, fileName),
        path.join(seriesDir, fileName),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
    } else {
      // 正常书文件夹：递归搜索
      const candidates = [
        path.join(seriesDir, folderName, fileName),
      ];
      // 也搜索子阶段文件夹
      try {
        for (const sub of fs.readdirSync(seriesDir)) {
          const subPath = path.join(seriesDir, sub);
          if (fs.statSync(subPath).isDirectory()) {
            candidates.push(path.join(subPath, folderName, fileName));
          }
        }
      } catch {}
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
    }
  }
  return null;
}

// ── 上传文件到 Storage ──
async function uploadFile(localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);
  const mime = getMime(localPath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mime,
      upsert: true,
    });

  if (error) {
    if (error.message?.includes('already exists')) return true;
    console.log(`    ❌ 上传失败: ${storagePath} — ${error.message}`);
    return false;
  }
  return true;
}

// ── 获取 Storage 公共 URL ──
function getStorageUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || '';
}

// ── 读取 Excel 并过滤 ──
async function readExcel(excelPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const ws = wb.getWorksheet('books_all');

  const headers = [];
  ws.getRow(1).eachCell((cell, col) => { headers[col] = cell.value; });

  const books = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const book = {};
    row.eachCell((cell, col) => { book[headers[col]] = cell.value || ''; });
    books.push(book);
  });

  return books;
}

// ── 主流程 ──
async function main() {
  const args = process.argv.slice(2);
  let root = '', excelPath = 'tools/readii_content_import.xlsx', dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i+1]) root = args[++i];
    if (args[i] === '--excel' && args[i+1]) excelPath = args[++i];
    if (args[i] === '--dry-run') dryRun = true;
  }

  if (!root) {
    console.log('Usage: node tools/upload_to_supabase.js --root "内容根目录" [--dry-run]');
    process.exit(1);
  }

  console.log(`📂 内容根目录: ${root}`);
  console.log(`📊 Excel: ${excelPath}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  if (dryRun) console.log('🧪 DRY RUN 模式 — 不会实际上传或写入数据库\n');

  // 读取 Excel
  const allBooks = await readExcel(excelPath);
  console.log(`📚 Excel 中共 ${allBooks.length} 本书`);

  // 过滤：只要文件齐全的（needs_review 列为空）
  const completeBooks = allBooks.filter(b => !b.needs_review);
  console.log(`✅ 文件齐全: ${completeBooks.length} 本`);
  console.log(`⏭️  跳过: ${allBooks.length - completeBooks.length} 本 (有缺失文件)\n`);

  if (!dryRun) {
    // 确保 Storage bucket 存在
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET);
    if (!bucketExists) {
      console.log(`📦 创建 Storage bucket: ${BUCKET}`);
      const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
      if (error && !error.message?.includes('already exists')) {
        console.log(`❌ 创建 bucket 失败: ${error.message}`);
        process.exit(1);
      }
    }
  }

  let uploaded = 0, failed = 0, skipped = 0;

  for (let i = 0; i < completeBooks.length; i++) {
    const book = completeBooks[i];
    const progress = `[${i+1}/${completeBooks.length}]`;

    console.log(`${progress} ${book.book_title} (${book.series_name})`);

    // 1. 插入 books 表
    let bookId;
    if (!dryRun) {
      const { data, error } = await supabase
        .from('books')
        .insert({
          title: book.book_title,
          series: book.series_name,
          level: book.level,
          total_days: book.total_days,
          age_min: book.age_min,
          age_max: book.age_max,
          is_published: false,
        })
        .select('id')
        .single();

      if (error) {
        console.log(`  ❌ 数据库写入失败: ${error.message}`);
        failed++;
        continue;
      }
      bookId = data.id;
    } else {
      bookId = `dry-run-${i}`;
    }

    console.log(`  📝 book_id: ${bookId}`);

    // 2. 上传 PDF
    const pdfLocal = findFile(root, book.series_key, book.folder_name, book.pdf);
    let pdfUrl = '';
    if (pdfLocal) {
      const pdfStorage = `books/${bookId}/book.pdf`;
      if (dryRun) {
        console.log(`  📄 [DRY] PDF: ${pdfLocal} → ${pdfStorage}`);
      } else {
        const ok = await uploadFile(pdfLocal, pdfStorage);
        if (ok) {
          pdfUrl = pdfStorage;
          console.log(`  📄 PDF 上传完成`);
        }
      }
    }

    // 3. 上传音频 + 插入 lessons
    for (let day = 1; day <= book.total_days; day++) {
      const readingFile = book[`reading_day_${day}`];
      const commentaryFile = day === 1 ? book.commentary : '';

      const readingLocal = findFile(root, book.series_key, book.folder_name, readingFile);
      const commentaryLocal = commentaryFile ? findFile(root, book.series_key, book.folder_name, commentaryFile) : null;

      let readingStoragePath = '';
      let commentaryStoragePath = '';

      if (readingLocal) {
        readingStoragePath = `books/${bookId}/day-${day}-reading.mp3`;
        if (dryRun) {
          console.log(`  🔊 [DRY] Day ${day} reading: ${readingLocal}`);
        } else {
          const ok = await uploadFile(readingLocal, readingStoragePath);
          if (ok) console.log(`  🔊 Day ${day} 阅读音频上传完成`);
          else readingStoragePath = '';
        }
      }

      if (commentaryLocal) {
        commentaryStoragePath = `books/${bookId}/day-${day}-commentary.mp3`;
        if (dryRun) {
          console.log(`  💬 [DRY] Day ${day} commentary: ${commentaryLocal}`);
        } else {
          const ok = await uploadFile(commentaryLocal, commentaryStoragePath);
          if (ok) console.log(`  💬 Day ${day} 讲解音频上传完成`);
          else commentaryStoragePath = '';
        }
      }

      // 插入 lessons 表
      if (!dryRun) {
        const { error } = await supabase
          .from('lessons')
          .insert({
            book_id: bookId,
            day_number: day,
            title: `Day ${day}`,
            reading_audio_url: readingStoragePath,
            commentary_audio_url: commentaryStoragePath,
            sort_order: day,
          });

        if (error) {
          console.log(`  ❌ Lesson 写入失败 (Day ${day}): ${error.message}`);
        }
      }
    }

    // 4. 更新 books 表的 PDF URL 和 is_published
    if (!dryRun && pdfUrl) {
      await supabase
        .from('books')
        .update({ pdf_url: pdfUrl, is_published: true })
        .eq('id', bookId);
    }

    uploaded++;
    console.log(`  ✅ 完成\n`);
  }

  console.log('═══════════════════════════════');
  console.log(`📊 上传完成`);
  console.log(`   成功: ${uploaded}`);
  console.log(`   失败: ${failed}`);
  console.log(`   跳过(缺文件): ${allBooks.length - completeBooks.length}`);
  console.log('═══════════════════════════════');
}

main().catch(err => {
  console.error('❌ 脚本出错:', err.message);
  process.exit(1);
});
