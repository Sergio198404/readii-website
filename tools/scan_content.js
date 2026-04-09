#!/usr/bin/env node
/**
 * Readii Content Scanner (Node.js)
 * 扫描内容文件夹，自动识别书籍和音频文件，生成 Excel 导入模板
 * Usage: node tools/scan_content.js --root "内容文件夹路径"
 *
 * 支持的目录结构:
 *   root/GK/一阶段/D1 at the market/  (子阶段 → 书文件夹)
 *   root/GK/gk-2第一周/               (散文件，按PDF分组)
 *   root/history/书名文件夹/
 */

const fs = require('fs');
const path = require('path');

// ── 依赖检查 ──
let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch {
  console.log('请先安装依赖: npm install exceljs');
  console.log('然后重新运行: node tools/scan_content.js --root "路径"');
  process.exit(1);
}

// ── 系列配置 ──
const SERIES_CONFIG = {
  GK:      { name: 'Heinemann GK',   level: 1, age_min: 3, age_max: 5 },
  G1:      { name: 'Heinemann G1',   level: 2, age_min: 5, age_max: 7 },
  G2:      { name: 'Heinemann G2',   level: 3, age_min: 6, age_max: 8 },
  history: { name: 'History Series',  level: 4, age_min: 7, age_max: 12 },
  US:      { name: 'Science Series',  level: 4, age_min: 7, age_max: 12 },
};

// ── 文件分类 ──
function classifyFile(filename) {
  const name = filename.toLowerCase();
  const stem = path.parse(filename).name.toLowerCase();

  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  if (!['.mp3', '.mp4', '.m4a'].some(ext => name.endsWith(ext))) return 'other';

  // V&G / G&V / V&Q = 词汇讲解/commentary
  if (/v&g|g&v|v&q|vg/i.test(stem)) return 'commentary';
  // -Q 结尾 = 问题音频
  if (/-q$/i.test(stem)) return 'question';
  // _1_1 / _1_2 = 多天阅读
  const dayMatch = stem.match(/_1_(\d+)/);
  if (dayMatch) return `reading_day_${dayMatch[1]}`;
  // -1 / -2 / -3 / -4 结尾
  if (/-1$/.test(stem)) return 'reading_day_1';
  if (/-2$/.test(stem)) return 'reading_day_2';
  if (/-3$/.test(stem)) return 'reading_day_3';
  if (/-4$/.test(stem)) return 'reading_day_4';
  // 默认 = 阅读
  return 'reading_day_1';
}

// ── 从文件夹名提取书名 ──
function cleanBookTitle(folderName) {
  let name = folderName;
  name = name.replace(/^\d+-D\d+-\d+\s*/, '');
  name = name.replace(/^D\d+-\d+\s*/, '');
  name = name.replace(/^D\d+\s*/, '');
  name = name.replace(/^\d+-\w+-\w+\s*/, '');
  return name.trim() || folderName;
}

// ── 扫描一个书文件夹 ──
function scanBookFolder(bookPath, seriesKey, config, phase) {
  const folderName = path.basename(bookPath);
  const bookTitle = cleanBookTitle(folderName);

  const files = {
    pdf: [], docx: [], commentary: [], question: [], other: [],
    reading_day_1: [], reading_day_2: [], reading_day_3: [], reading_day_4: [],
  };

  for (const f of fs.readdirSync(bookPath).sort()) {
    if (f.startsWith('.')) continue;
    const fullPath = path.join(bookPath, f);
    if (!fs.statSync(fullPath).isFile()) continue;
    const ftype = classifyFile(f);
    if (files[ftype]) files[ftype].push(f);
  }

  let totalDays = 1;
  for (const d of [2, 3, 4]) {
    if (files[`reading_day_${d}`].length > 0) totalDays = d;
  }

  return {
    series_key: seriesKey,
    series_name: config.name,
    phase: phase || '',
    level: config.level,
    age_min: config.age_min,
    age_max: config.age_max,
    folder_name: folderName,
    book_title: bookTitle,
    total_days: totalDays,
    pdf: files.pdf[0] || '',
    docx: files.docx[0] || '',
    commentary: files.commentary[0] || '',
    reading_day_1: files.reading_day_1[0] || '',
    reading_day_2: files.reading_day_2[0] || '',
    reading_day_3: files.reading_day_3[0] || '',
    reading_day_4: files.reading_day_4[0] || '',
    question: files.question[0] || '',
  };
}

// ── 扫描散文件文件夹（gk-2第一周这种，按 PDF 分组） ──
function scanLooseFiles(dirPath, seriesKey, config, phase) {
  const allFiles = fs.readdirSync(dirPath).filter(f => {
    const full = path.join(dirPath, f);
    return fs.statSync(full).isFile() && !f.startsWith('.');
  });

  // 按 PDF 分组：每个 PDF 代表一本书
  const pdfs = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));
  const audios = allFiles.filter(f => /\.(mp3|mp4|m4a)$/i.test(f));

  const books = [];
  for (const pdf of pdfs) {
    const pdfStem = path.parse(pdf).name;
    // 提取书名：去掉前缀数字
    const titleMatch = pdfStem.match(/^\d+\s+(.+)/) || [null, pdfStem];
    const bookTitle = titleMatch[1];
    const numberPrefix = pdfStem.match(/^(\d+)/)?.[1] || '';

    // 匹配对应的音频（文件名包含相同数字前缀或书名关键词）
    const matchedAudios = audios.filter(a => {
      const aStem = a.toLowerCase();
      if (numberPrefix && aStem.includes(numberPrefix)) return true;
      if (bookTitle && aStem.includes(bookTitle.toLowerCase().split(' ')[0])) return true;
      return false;
    });

    const files = { commentary: '', reading_day_1: '', question: '' };
    for (const a of matchedAudios) {
      const ftype = classifyFile(a);
      if (ftype === 'commentary') files.commentary = a;
      else if (ftype === 'question') files.question = a;
      else if (ftype.startsWith('reading_day_')) files[ftype] = files[ftype] || a;
    }

    books.push({
      series_key: seriesKey,
      series_name: config.name,
      phase: phase || '',
      level: config.level,
      age_min: config.age_min,
      age_max: config.age_max,
      folder_name: `[loose] ${phase}`,
      book_title: bookTitle,
      total_days: 1,
      pdf: pdf,
      docx: '',
      commentary: files.commentary || '',
      reading_day_1: files.reading_day_1 || '',
      reading_day_2: '',
      reading_day_3: '',
      reading_day_4: '',
      question: files.question || '',
    });
  }

  return books;
}

// ── 扫描系列（支持嵌套子阶段） ──
function scanSeries(root, seriesKey) {
  // 收集所有匹配的路径（支持多个 zip 解压文件夹，如 G2-...-001 和 G2-...-002）
  const allPaths = [];
  const direct = path.join(root, seriesKey);
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) {
    allPaths.push(direct);
  }

  for (const d of fs.readdirSync(root)) {
    if (!d.toUpperCase().startsWith(seriesKey.toUpperCase())) continue;
    const full = path.join(root, d);
    if (!fs.statSync(full).isDirectory()) continue;
    const inner = path.join(full, seriesKey);
    if (fs.existsSync(inner) && fs.statSync(inner).isDirectory()) {
      if (!allPaths.includes(inner)) allPaths.push(inner);
    } else if (!allPaths.includes(full)) {
      allPaths.push(full);
    }
  }

  if (allPaths.length === 0) {
    console.log(`  跳过: ${seriesKey} (未找到)`);
    return [];
  }

  const config = SERIES_CONFIG[seriesKey] || {
    name: seriesKey, level: 1, age_min: 3, age_max: 12,
  };

  const books = [];

  for (const seriesPath of allPaths) {
    console.log(`    来源: ${path.basename(path.dirname(seriesPath))}/${path.basename(seriesPath)}`);
  const entries = fs.readdirSync(seriesPath).sort();

  for (const entry of entries) {
    const entryPath = path.join(seriesPath, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;

    // 检查这个子目录是书文件夹还是阶段文件夹
    const subEntries = fs.readdirSync(entryPath);
    const hasSubDirs = subEntries.some(e =>
      fs.statSync(path.join(entryPath, e)).isDirectory()
    );
    const hasAudioFiles = subEntries.some(e =>
      /\.(mp3|mp4|m4a)$/i.test(e)
    );

    if (hasSubDirs) {
      // 这是一个阶段文件夹（如 一阶段），递归扫描其中的书文件夹
      console.log(`    阶段: ${entry}`);
      for (const bookEntry of fs.readdirSync(entryPath).sort()) {
        const bookPath = path.join(entryPath, bookEntry);
        if (fs.statSync(bookPath).isDirectory()) {
          books.push(scanBookFolder(bookPath, seriesKey, config, entry));
        }
      }
      // 也检查阶段文件夹里的散文件
      const looseAudios = subEntries.filter(e =>
        fs.statSync(path.join(entryPath, e)).isFile() && /\.(mp3|mp4|m4a|pdf)$/i.test(e)
      );
      if (looseAudios.length > 0) {
        const looseBooks = scanLooseFiles(entryPath, seriesKey, config, entry);
        if (looseBooks.length > 0) {
          console.log(`      散文件: ${looseBooks.length} 本`);
          books.push(...looseBooks);
        }
      }
    } else if (hasAudioFiles) {
      // 这是一个书文件夹
      books.push(scanBookFolder(entryPath, seriesKey, config, ''));
    }
  }

  // 也检查系列根目录的散文件
  const rootFiles = entries.filter(e =>
    fs.statSync(path.join(seriesPath, e)).isFile() && /\.(mp3|mp4|m4a|pdf)$/i.test(e)
  );
  if (rootFiles.length > 0) {
    const looseBooks = scanLooseFiles(seriesPath, seriesKey, config, 'root');
    if (looseBooks.length > 0) {
      console.log(`    散文件(root): ${looseBooks.length} 本`);
      books.push(...looseBooks);
    }
  }
  } // end for (seriesPath of allPaths)

  return books;
}

// ── 生成 Excel ──
async function writeExcel(allBooks, outputPath) {
  const wb = new ExcelJS.Workbook();

  // Sheet 1: books_all
  const ws = wb.addWorksheet('books_all');
  const headers = [
    'series_key', 'series_name', 'phase', 'level', 'age_min', 'age_max',
    'folder_name', 'book_title', 'total_days',
    'pdf', 'commentary', 'question', 'docx',
    'reading_day_1', 'reading_day_2', 'reading_day_3', 'reading_day_4',
    'needs_review', 'notes',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A2D' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { horizontal: 'center' };
  });

  for (const book of allBooks) {
    const missing = [];
    if (!book.pdf) missing.push('PDF');
    if (!book.reading_day_1) missing.push('Reading');
    if (!book.commentary) missing.push('Commentary');

    const row = ws.addRow([
      book.series_key, book.series_name, book.phase, book.level,
      book.age_min, book.age_max, book.folder_name, book.book_title,
      book.total_days, book.pdf, book.commentary, book.question,
      book.docx, book.reading_day_1, book.reading_day_2,
      book.reading_day_3, book.reading_day_4,
      missing.length ? `Missing: ${missing.join(', ')}` : '',
      '',
    ]);

    if (missing.length) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      });
    }
  }

  ws.getColumn('G').width = 35;
  ws.getColumn('H').width = 30;
  for (const col of ['J','K','L','M','N','O','P','Q']) {
    ws.getColumn(col).width = 35;
  }

  // Sheet 2: needs_review
  const ws2 = wb.addWorksheet('needs_review');
  const h2 = ws2.addRow(['folder_name', 'book_title', 'series', 'phase', 'missing_files']);
  h2.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A2D' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  for (const book of allBooks) {
    const missing = [];
    if (!book.pdf) missing.push('PDF');
    if (!book.reading_day_1) missing.push('Reading audio');
    if (!book.commentary) missing.push('Commentary audio');
    if (missing.length) {
      ws2.addRow([book.folder_name, book.book_title, book.series_name, book.phase, missing.join(', ')]);
    }
  }

  // Sheet 3: summary
  const ws3 = wb.addWorksheet('summary');
  ws3.addRow(['Series', 'Phase', 'Book Count']);
  const counts = {};
  for (const book of allBooks) {
    const key = `${book.series_name}|${book.phase}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(counts)) {
    const [series, phase] = key.split('|');
    ws3.addRow([series, phase, count]);
  }
  ws3.addRow(['TOTAL', '', allBooks.length]);

  await wb.xlsx.writeFile(outputPath);
  console.log(`\n✅ Excel 已生成: ${outputPath}`);
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  let root = '';
  let output = 'tools/readii_content_import.xlsx';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i+1]) root = args[++i];
    if (args[i] === '--output' && args[i+1]) output = args[++i];
  }

  if (!root) {
    console.log('Usage: node tools/scan_content.js --root "内容根目录"');
    console.log('Example: node tools/scan_content.js --root "C:/Users/sergi/Downloads"');
    process.exit(1);
  }

  if (!fs.existsSync(root)) {
    console.log(`❌ 路径不存在: ${root}`);
    process.exit(1);
  }

  console.log(`📂 扫描根目录: ${root}`);
  const allBooks = [];

  for (const seriesKey of Object.keys(SERIES_CONFIG)) {
    const books = scanSeries(root, seriesKey);
    console.log(`  ${seriesKey}: ${books.length} 本书`);
    allBooks.push(...books);
  }

  console.log(`\n📚 共找到 ${allBooks.length} 本书`);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  await writeExcel(allBooks, output);

  const missingBooks = allBooks.filter(b => !b.reading_day_1 || !b.pdf);
  if (missingBooks.length) {
    console.log(`\n⚠️  ${missingBooks.length} 本书有缺失文件，见 Excel 的 needs_review sheet`);
  }
}

main().catch(console.error);
