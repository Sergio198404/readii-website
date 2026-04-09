/**
 * Readii Library — 从 Supabase 拉真实书库数据
 * 替换 app view 里的静态 mock 数据
 */

// ── 书库状态 ──
let allBooks = [];
let currentBook = null;
let currentLesson = null;
let currentFilter = 'all';

// ── 系列图标和颜色映射 ──
const SERIES_STYLE = {
  'Heinemann GK': { icon: '📗', gradient: 'ucg' },
  'Heinemann G1': { icon: '📘', gradient: 'ucb' },
  'Heinemann G2': { icon: '📙', gradient: 'uco' },
  'History Series': { icon: '🌍', gradient: 'ucb' },
  'Science Series': { icon: '🔬', gradient: 'ucr' },
};

// ── 加载书库 ──
async function loadLibrary() {
  const { data, error } = await _supabase
    .from('books')
    .select(`
      id, title, title_zh, series, level, total_days,
      age_min, age_max, pdf_url, is_published,
      lessons (id, day_number, title, reading_audio_url, commentary_audio_url, sort_order)
    `)
    .eq('is_published', true)
    .order('series')
    .order('level');

  if (error) {
    console.error('加载书库失败:', error.message);
    return;
  }

  allBooks = data || [];
  renderLibrary(allBooks);
  updateStats(allBooks);
}

// ── 渲染书库列表（替换 app view 里的静态内容） ──
function renderLibrary(books) {
  const container = document.getElementById('book-list');
  if (!container) return;

  if (books.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink3);">No books found</div>';
    return;
  }

  container.innerHTML = books.map((book, i) => {
    const style = SERIES_STYLE[book.series] || { icon: '📖', gradient: 'ucg' };
    const lessonCount = book.lessons?.length || 0;
    const isZh = document.body.classList.contains('zh');

    return `
      <div class="urow" onclick="selectBook('${book.id}')" data-book-id="${book.id}">
        <div class="ucov ${style.gradient}">${style.icon}</div>
        <div class="ui">
          <div class="ut">${book.series} · Level ${book.level}</div>
          <div class="utit">${isZh && book.title_zh ? book.title_zh : book.title}</div>
          <div class="um">${lessonCount} ${isZh ? '节课' : 'lesson' + (lessonCount > 1 ? 's' : '')} · ${book.total_days} ${isZh ? '天' : 'day' + (book.total_days > 1 ? 's' : '')}</div>
        </div>
        <span class="ubadge ubd">${style.icon}</span>
      </div>
    `;
  }).join('');
}

// ── 更新统计数据 ──
function updateStats(books) {
  const totalLessons = books.reduce((sum, b) => sum + (b.lessons?.length || 0), 0);

  // 更新 landing page 统计
  const statsEls = document.querySelectorAll('.sn');
  if (statsEls.length >= 1) statsEls[0].textContent = totalLessons.toLocaleString() + '+';

  // 更新书库面板计数
  const countEl = document.getElementById('book-count');
  if (countEl) countEl.textContent = `(${books.length})`;
}

// ── 选择一本书 ──
async function selectBook(bookId) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  currentBook = book;
  currentLesson = book.lessons?.[0] || null;

  // 高亮当前选中
  document.querySelectorAll('.urow').forEach(el => el.classList.remove('act'));
  const el = document.querySelector(`[data-book-id="${bookId}"]`);
  if (el) el.classList.add('act');

  // 更新阅读面板
  updateReaderPanel();
}

// ── 更新阅读面板 ──
async function updateReaderPanel() {
  if (!currentBook || !currentLesson) return;

  const isZh = document.body.classList.contains('zh');
  const style = SERIES_STYLE[currentBook.series] || { icon: '📖' };

  // 更新书名区域
  const rpbu = document.querySelector('.rpbu');
  const rpbt = document.querySelector('.rpbt');
  const rpbtr = document.querySelector('.rpbtr');
  if (rpbu) rpbu.textContent = `${currentBook.series} · Level ${currentBook.level}`;
  if (rpbt) rpbt.textContent = isZh && currentBook.title_zh ? currentBook.title_zh : currentBook.title;
  if (rpbtr) rpbtr.textContent = currentLesson.title || `Day ${currentLesson.day_number}`;

  // 更新顶部面包屑
  const breadcrumb = document.querySelector('.atbbc span');
  if (breadcrumb) breadcrumb.textContent = currentBook.title;

  // 加载音频
  if (currentLesson.reading_audio_url) {
    const audioUrl = await getSignedUrl(currentLesson.reading_audio_url);
    if (audioUrl) {
      window._currentAudioUrl = audioUrl;
    }
  }
}

// ── 按系列筛选 ──
function filterBySeries(series) {
  currentFilter = series;
  const filtered = series === 'all'
    ? allBooks
    : allBooks.filter(b => b.series === series);
  renderLibrary(filtered);

  // 更新筛选按钮状态
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isOn = btn.dataset.series === series;
    btn.classList.toggle('on', isOn);
    btn.style.background = isOn ? 'var(--fp)' : 'transparent';
    btn.style.color = isOn ? 'var(--forest)' : 'var(--ink3)';
  });
}

// ── 搜索 ──
function searchBooks(query) {
  if (!query.trim()) {
    renderLibrary(allBooks);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allBooks.filter(b =>
    b.title.toLowerCase().includes(q) ||
    (b.title_zh && b.title_zh.includes(q)) ||
    b.series.toLowerCase().includes(q)
  );
  renderLibrary(filtered);
}

// ── 页面加载时初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  // 当进入 app view 时加载书库
  const origOpenApp = window.openApp;
  window.openApp = function() {
    if (origOpenApp) origOpenApp();
    if (allBooks.length === 0) loadLibrary();
  };
});
