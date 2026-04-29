# Work Log — Readii Website

---

## 2026-04-29 | Session 27 | v2.1.0

**Objective:** Make the dual-engine business model visible inside the product. Add a UK Business Communication Programme module so paying-tier conversion has an in-product surface, and add a Progress-page upgrade banner that fires when a user is clearly engaged (≥10 attempts, ≥60 avg).

**Completed:**
- [x] New left-sidebar tab "UK Business" (🇬🇧) inserted between Word Bank and Review, wired through `showAppView('uk-business')`
- [x] `#view-uk-business` with home (4 scene cards + bottom CTA) and detail (5 sentences + ReadiiSpeech) views
- [x] `UK_BUSINESS_SCENES` array with hard-coded content for the 4 scenarios: Email Writing, Business Meetings, Pitching, Daily Life — each 5 British-professional sentences
- [x] `loadUkBusinessStats()` / `logUkBusinessAttempt()` — read & write `pronunciation_attempts` with `source='uk_business'`, `module_id=scene.id`
- [x] Scene cards render best-score + attempt-count footer, identical pattern to Voice Coach
- [x] CTA card on home: "Ready for personalised coaching?" + From £2,000 + mailto:hello@readii.co.uk
- [x] My Progress upgrade banner inserted between Score Trend and By Module, fires when `attempts.length >= 10 && avg >= 60`
- [x] Banner ✕ writes `localStorage.readii-upgrade-dismissed=true` and stays dismissed; "Learn More →" routes to `showAppView('uk-business')`
- [x] `_pgSourceLabel()` extended to recognise `uk_business` (with per-scene title) and `word_bank` so Recent Attempts displays the right label

**Why this matters:**
The product has had no path from "AI practice" to "high-value services" — all five existing tabs (Reading / Voice Coach / Progress / Word Bank / Review) sit on the low-margin engagement side. v2.1 adds the first in-product surface for the £2,000 programme, and uses real engagement signals (≥10 attempts, ≥60 avg) to gate the upsell so it appears earned, not pushy.

**Files changed:**
- index.html (v2.0.1 → v2.1.0): new sidebar nav item, `#view-uk-business` markup (home + detail), CSS block (`.ukb-*` and `.pg-upgrade-*`), `UK_BUSINESS_SCENES` constant + render functions, `showAppView` dispatch extension, banner injection in `renderProgress`, `_pgSourceLabel` extension
- VERSION (2.0.1 → 2.1.0)
- CHANGELOG.md ([2.1.0] entry)
- WORKLOG.md (this Session 27)

**Verified by:** inline `<script>` block parses cleanly via `new Function(code)` syntax check.

---

## 2026-04-09 | Session 1 | v1.0.0

**Objective:** Build complete website from scratch for Home Office visa settlement visibility

**Completed:**
- [x] Project structure initialised
- [x] v1.0.0 landing page built (index.html)
- [x] Bilingual EN/ZH toggle implemented
- [x] Product dashboard (app view) built
- [x] CHANGELOG and WORKLOG established

**Pending / Next session:**
- [ ] Replace LinkedIn placeholder URLs with real profile links
- [ ] Deploy to Netlify
- [ ] Write first English blog article for /articles page
- [ ] Add Articles/Blog page (for Google indexability)
- [ ] Add real book cover images to /assets/images

**Files changed:**
- index.html (created, v1.0.0)
- CHANGELOG.md (created)
- WORKLOG.md (created)
- README.md (created)
- VERSION (created, value: 1.0.0)

---

## 2026-04-09 | Session 2 | v1.0.1

**Objective:** Update LinkedIn links, clean up project files

**Completed:**
- [x] Company LinkedIn URL updated: linkedin.com/company/112639056
- [x] Personal LinkedIn URL placeholder set
- [x] Removed duplicate readii-new.html

**Pending:**
- [ ] Confirm Kevin's personal LinkedIn handle
- [ ] Connect GitHub repo to Netlify
- [ ] Upload audio content to Supabase Storage
- [ ] Build subscription/payment layer (Stripe £5/mo)

**Files changed:**
- index.html (v1.0.0 → v1.0.1, LinkedIn links updated)
- WORKLOG.md (updated)
- readii-new.html (deleted)

---

## 2026-04-09 | Session 3 | v1.0.2

**Objective:** Design Supabase database schema for audio content platform

**Completed:**
- [x] Created database/schema.sql — 6 tables (books, lessons, vocabulary, user_profiles, progress, streaks)
- [x] Created database/storage-structure.md — Supabase Storage bucket layout
- [x] Created database/seed-example.sql — sample data insert
- [x] Created database/README.md — table overview and audio upload workflow

**Pending:**
- [ ] Create Excel import template for batch book entry
- [ ] Build import script (CSV → Supabase)
- [ ] Set up Supabase project and run schema.sql
- [ ] Upload first batch of audio files to Storage
- [ ] Connect frontend to Supabase API

**Files changed:**
- database/schema.sql (created)
- database/storage-structure.md (created)
- database/seed-example.sql (created)
- database/README.md (created)
- VERSION (1.0.1 → 1.0.2)
- WORKLOG.md (updated)
- CHANGELOG.md (updated)

---

## 2026-04-09 | Session 4 | v1.0.3

**Objective:** Build content scanner tool to inventory all audio books for Supabase import

**Completed:**
- [x] Created tools/scan_content.js (Node.js, replaced Python version — no Python installed)
- [x] Created tools/scan_content.py (original Python version, kept for reference)
- [x] Created tools/requirements.txt
- [x] Installed exceljs via npm
- [x] Ran scanner against Downloads folder

**Scan results:**
- GK (Heinemann GK): 72 books (一阶段, 二阶段, gk-2第一周)
- History Series: 21 books
- G1, G2, US: not yet downloaded/extracted — 0 books
- **Total: 93 books found**
- **36 books have missing files** (see needs_review sheet in Excel)

**Pending:**
- [ ] Download/extract G1, G2, US content folders
- [ ] Re-run scanner after all content is in place
- [ ] Review needs_review sheet — fix missing PDFs/audio
- [ ] Build upload script (local files → Supabase Storage + DB insert)

**Files changed:**
- tools/scan_content.js (created)
- tools/scan_content.py (created, Python reference)
- tools/requirements.txt (created)
- tools/readii_content_import.xlsx (generated, 93 books)
- package.json (created, npm init)
- VERSION (1.0.2 → 1.0.3)
- WORKLOG.md (updated)
- CHANGELOG.md (updated)

---

## 2026-04-09 | Session 5 | v1.0.4

**Objective:** Upload all complete books to Supabase (Storage + Database)

**Completed:**
- [x] Re-scanned with all series: 372 books total (GK 72, G1 111, G2 161, History 21, US 7)
- [x] Created tools/upload_to_supabase.js — bulk upload script
- [x] Executed database/schema.sql on Supabase (6 tables created)
- [x] Created Storage bucket: readii-content (private)
- [x] Uploaded 239 books — 0 failures
- [x] Each book: PDF + reading audio + commentary audio → Storage
- [x] Each book: books row + lessons rows → Database

**Upload summary:**
- 239 books uploaded successfully
- 0 failures
- 133 skipped (missing files)

**Pending:**
- [ ] Fix 133 books with missing files and re-upload
- [ ] Connect index.html frontend to Supabase API (live data)
- [ ] Set up Supabase Auth (user registration/login)
- [ ] Integrate Stripe for £5/mo subscription
- [ ] Deploy to Netlify

**Files changed:**
- tools/upload_to_supabase.js (created)
- tools/upload_log.txt (generated)
- .env (created, contains Supabase keys)
- .gitignore (created)
- VERSION (1.0.3 → 1.0.4)
- WORKLOG.md (updated)
- CHANGELOG.md (updated)

---

## 2026-04-09 | Session 7 | v1.0.4

**Completed:**
- [x] Netlify 部署成功
- [x] readii.co.uk 域名绑定完成
- [x] HTTPS 证书自动签发
- [x] 239本书 is_published = true
- [x] 网站正式上线

**网站地址:** https://readii.co.uk

**下一个 Session：**
- [ ] Stripe £5/月订阅接入
- [ ] 用户注册登录（Supabase Auth）
- [ ] 133本缺文件的书补齐后重新上传

---

## 2026-04-09 | Session 8 | v1.0.5

**Objective:** Fix LinkedIn URL, update placeholder links, correct email domain

**Completed:**
- [x] Kevin LinkedIn → linkedin.com/in/xiaoyu-su-217a3b85/
- [x] Sign in → mailto:hello@readii.co.uk
- [x] Start free trial → mailto with subject
- [x] Enrol now → mailto with subject
- [x] All readii.vip emails → readii.co.uk
- [x] Hero card domain → readii.co.uk
- [x] Version comment → v1.0.5

**Files changed:**
- index.html (v1.0.4 → v1.0.5)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)
- VERSION (1.0.5)

---

## 2026-04-10 | Session 9 | 开始 Stripe + 用户登录

**Objective:** 接入 Stripe £5/月订阅 + Supabase Auth 用户登录

**Completed:**
- [x] Stripe 账号注册，创建 2 个产品 (£5/mo + £299)
- [x] 网站接入 Stripe Checkout 支付按钮
- [x] Netlify serverless function: create-checkout.js
- [x] Supabase Auth 登录/注册弹窗（中英双语）
- [x] checkout.js: 支付流程 + 成功提示横幅
- [x] auth.js: 注册/登录/登出 + 用户状态管理

**Pending:**
- [ ] 设置 Netlify 环境变量 STRIPE_SECRET_KEY
- [ ] 订阅成功后自动更新 user_profiles (webhook)
- [ ] 登录后根据订阅状态控制内容访问

**Files changed:**
- assets/js/stripe-config.js (updated, live keys)
- assets/js/checkout.js (created)
- assets/js/auth.js (created in Session 9 start)
- netlify/functions/create-checkout.js (created)
- netlify/functions/package.json (created)
- netlify.toml (updated, added functions dir)
- index.html (v1.0.5 → v1.1.0, Stripe buttons + checkout.js)
- VERSION (1.1.0)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-10 | Session 10 | v1.1.1

**Objective:** Stripe Webhook — 支付成功后自动更新订阅状态

**Completed:**
- [x] Created netlify/functions/stripe-webhook.js
- [x] Handles checkout.session.completed → set subscription_status = 'active'
- [x] Handles customer.subscription.deleted → set subscription_status = 'cancelled'
- [x] Added @supabase/supabase-js to functions dependencies

**Requires Netlify env vars:**
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- STRIPE_WEBHOOK_SECRET (from Stripe Dashboard → Webhooks)

**Requires Stripe Webhook setup:**
- Endpoint: https://readii.co.uk/.netlify/functions/stripe-webhook
- Events: checkout.session.completed, customer.subscription.deleted

**Files changed:**
- netlify/functions/stripe-webhook.js (created)
- netlify/functions/package.json (added supabase-js)
- VERSION (1.1.0 → 1.1.1)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)


---

## 2026-04-11 | Session 11 | v1.2.0

**Objective:** Content access control + real library rendering

**Completed:**
- [x] library.js rewritten as ES module with checkAccess() subscription check
- [x] loadLibrary() fetches published books from Supabase
- [x] loadProgress() / saveProgress() progress tracking functions
- [x] index.html bottom script converted to module, imports library.js
- [x] App view book list replaced with library-grid layout
- [x] Subscribed users see ▶ Listen, non-subscribed see 🔒 Subscribe
- [x] Free users see subscribe banner prompt
- [x] Added book-card / subscribe-banner CSS
- [x] Nav bar updates dynamically based on login + subscription status
- [x] Settings button bound to sign out

**Pending:**
- [ ] openBook() connect to real audio player
- [ ] Progress tracking UI (read/unread status)
- [ ] Fix 133 books with missing files and re-upload
- [ ] Add Articles/Blog page (Google indexability)

**Files changed:**
- assets/js/library.js (rewritten, ES module with access control)
- index.html (v1.1.1 → v1.2.0, module script + library-grid + CSS)
- VERSION (1.1.1 → 1.2.0)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 11 (continued) | v1.2.1

**Objective:** Connect real audio playback to book player

**Completed:**
- [x] openBook() rewritten: fetches book lessons from Supabase, finds first lesson with audio
- [x] HTML5 Audio element created/updated on book open
- [x] Play/pause button connected to real audio stream
- [x] Progress bar updates in real-time via timeupdate event
- [x] Player UI (title, series, day) updates when book is opened
- [x] Auto-saves progress to Supabase on audio ended (reading_completed)
- [x] saveProgress imported from library.js module

**Pending:**
- [ ] Audio signed URLs for private Supabase Storage bucket
- [ ] Commentary audio playback (second audio track)
- [ ] Seek functionality connected to real audio
- [ ] Speed control connected to real audio

**Files changed:**
- index.html (v1.2.0 → v1.2.1, real audio playback in openBook)
- VERSION (1.2.0 → 1.2.1)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 12 | v1.2.2

**Objective:** Fix audio playback for private Storage bucket (signed URLs)

**Completed:**
- [x] openBook() now checks if audio URL is a storage path vs full URL
- [x] Storage paths auto-converted to signed URLs via getSignedUrl() (1hr expiry)
- [x] supabase-client.js cleaned up, getSignedUrl() error logging improved
- [x] Removed ES module export from supabase-client.js (stays as global script)

**Pending:**
- [ ] Verify audio plays after deploy (depends on reading_audio_url format in DB)
- [ ] Commentary audio playback (second track)
- [ ] Seek and speed controls connected to real audio

**Files changed:**
- assets/js/supabase-client.js (cleaned up, signed URL function updated)
- index.html (v1.2.1 -> v1.2.2, signed URL logic in openBook)
- VERSION (1.2.1 -> 1.2.2)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 13 | v1.3.0

**Objective:** Commentary audio, seek/speed controls, Articles/Blog section

**Completed:**
- [x] openBook() rewritten with dual audio track support (reading + commentary)
- [x] Track toggle buttons: Reading / Commentary with bilingual labels
- [x] Seek: click progress bar to jump to position in real audio
- [x] Speed: 0.75x/1.0x/1.25x/1.5x connected to audio.playbackRate
- [x] Commentary track auto-disabled if no commentary_audio_url
- [x] Created articles/index.html with 3 article cards
- [x] Created articles/why-ai-is-changing-english-learning.html (full SEO article)
- [x] Footer "Articles & Insights" link updated to /articles/

**Pending:**
- [ ] Write remaining 2 articles (UK-China trade, founder story)
- [ ] 133 books with missing files to fix and re-upload
- [ ] Mobile responsive improvements
- [ ] AI pronunciation scoring integration

**Files changed:**
- index.html (v1.2.2 -> v1.3.0, dual audio + articles link)
- articles/index.html (created)
- articles/why-ai-is-changing-english-learning.html (created)
- VERSION (1.2.2 -> 1.3.0)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 13 (continued) | v1.3.1

**Objective:** Fix player visibility — sticky bottom + scroll into view

**Completed:**
- [x] .aplayer CSS changed to position:sticky;bottom:0 with shadow
- [x] openBook() scrolls to player and highlights with green border (2s)
- [x] Player always visible at bottom of reading panel

**Files changed:**
- index.html (v1.3.0 -> v1.3.1, sticky player + scroll fix)
- VERSION (1.3.0 -> 1.3.1)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 14 | v1.3.2

**Objective:** Integrate PDF viewer into reading panel

**Completed:**
- [x] Mock caterpillar text replaced with iframe PDF viewer
- [x] openBook() generates signed URL for books/{id}/book.pdf
- [x] PDF loads in iframe, fills left panel space
- [x] Placeholder and fallback states for missing PDFs
- [x] rpbody CSS updated for flex layout

**Pending:**
- [ ] Confirm actual PDF path format in Supabase Storage
- [ ] Handle different PDF naming conventions per book
- [ ] 133 books with missing files to fix

**Files changed:**
- index.html (v1.3.1 -> v1.3.2, PDF viewer + CSS)
- VERSION (1.3.1 -> 1.3.2)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 14 (continued) | v1.3.3

**Objective:** Real progress tracking, streak system, completion badges

**Completed:**
- [x] library.js: loadProgress, saveProgress, loadStreak, updateStreak
- [x] openBook() ended listeners save reading_completed + commentary_completed
- [x] Auto-save every 30 seconds during playback
- [x] updateStreak() with consecutive day logic
- [x] updateProgressPanel() updates sidebar + right panel with real data
- [x] renderLibrary() shows Done badge and Re-read button for completed books
- [x] initApp() loads progress on login

**Pending:**
- [ ] Pronunciation score integration
- [ ] Weekly progress calculation (currently shows all-time)
- [ ] 133 books with missing files to fix

**Files changed:**
- assets/js/library.js (added streak functions, updated progress)
- index.html (v1.3.2 -> v1.3.3, progress tracking + badges)
- VERSION (1.3.2 -> 1.3.3)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 15 | v1.3.5

**Objective:** Clean up landing page — fix copyright, update mock data

**Completed:**
- [x] Footer copyright 2025 → 2026
- [x] For Children mock books replaced with real series names (GK, G1, History, Science)
- [x] Confirmed Sign in button already working (showAuthModal binding intact)

**Files changed:**
- index.html (v1.3.3 -> v1.3.5, copyright + mock data)
- VERSION (1.3.3 -> 1.3.5)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 15 (continued) | v1.3.6

**Objective:** Improve footer text contrast

**Completed:**
- [x] Footer background darkened to #0F0E0C
- [x] All footer text opacity increased for readability

**Files changed:**
- index.html (v1.3.5 -> v1.3.6, footer contrast)
- VERSION (1.3.5 -> 1.3.6)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-11 | Session 15 (continued) | v1.3.7

**Objective:** Footer redesign — light background with dark text

**Completed:**
- [x] Footer background: dark → var(--cream2) light
- [x] All text colors switched to ink/ink2/ink3 theme vars
- [x] Link hover: white → forest green
- [x] Borders use var(--border) instead of rgba white

**Files changed:**
- index.html (v1.3.6 -> v1.3.7, footer light theme)
- VERSION (1.3.6 -> 1.3.7)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-13 | Session 16 | v1.3.8

**Objective:** Working series filter tabs in library

**Completed:**
- [x] Library header redesigned with serif title + pill tabs
- [x] .stab CSS with active state
- [x] filterBooks() client-side filter using data-series attribute
- [x] Book cards now include data-series attribute
- [x] Subscribe banner hidden when filtering

**Files changed:**
- index.html (v1.3.7 -> v1.3.8, series filter tabs)
- VERSION (1.3.7 -> 1.3.8)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-14 | Session 17 | v1.3.9

**Objective:** About page AI transition narrative + Privacy Policy page

**Completed:**
- [x] Founder bio updated with AI pivot narrative (EN + ZH)
- [x] privacy-policy.html created (UK GDPR compliant, 12 sections)
- [x] Footer Privacy Policy link added (bilingual)

**Files changed:**
- index.html (v1.3.8 -> v1.3.9, About bio + footer link)
- privacy-policy.html (created)
- VERSION (1.3.8 -> 1.3.9)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-14 | Session 17 (continued) | v1.4.0

**Objective:** Clean up footer Connect column

**Completed:**
- [x] Removed placeholder WeChat/Xiaohongshu/Douyin links
- [x] Connect column now has only LinkedIn, email, Privacy Policy
- [x] Privacy Policy moved from Company column to Connect column

**Files changed:**
- index.html (v1.3.9 -> v1.4.0, footer cleanup)
- VERSION (1.3.9 -> 1.4.0)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-14 | Session 17 (continued) | v1.4.1

**Objective:** Fix Netlify redirect catching static HTML pages

**Completed:**
- [x] netlify.toml: added /articles/* and /privacy-policy.html rules before /* wildcard
- [x] Static HTML pages now served correctly instead of falling through to index.html

**Files changed:**
- netlify.toml (added specific redirects before wildcard)
- index.html (v1.4.0 -> v1.4.1)
- VERSION (1.4.0 -> 1.4.1)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-14 | Session 18 | v1.4.2

**Objective:** Create missing article pages (2 and 3)

**Completed:**
- [x] articles/uk-china-trade-communication-gap.html created
- [x] articles/from-beijing-to-canterbury.html created (Shanghai origin)
- [x] articles/index.html: Beijing -> Shanghai in title and excerpt

**Files changed:**
- articles/uk-china-trade-communication-gap.html (created)
- articles/from-beijing-to-canterbury.html (created)
- articles/index.html (Beijing -> Shanghai)
- index.html (v1.4.1 -> v1.4.2)
- VERSION (1.4.1 -> 1.4.2)
- CHANGELOG.md (updated)
- WORKLOG.md (updated)

---

## 2026-04-29 | Session 19 | v1.4.4

**Objective:** Replace the static "Tap to read aloud" demo on the reading page with a real AI pronunciation assessment using the browser-native Web Speech API (en-GB), no backend, no paid API.

**Completed:**
- [x] AI Pronunciation panel rebuilt: 5 preset Level-2 British sentences (hungry caterpillar pool) each with own "Read aloud" mic button
- [x] `SpeechRecognition` / `webkitSpeechRecognition` integration, `lang='en-GB'`, `continuous=false`, `interimResults=false`
- [x] Listening state: pulsing mic icon (CSS keyframes), 10s max-capture safety timer, auto-stop on browser end-of-speech
- [x] Scoring: tokenise target + transcript (lowercased, punctuation stripped), exact-match count → 0–100
- [x] Word-level alignment via LCS — green ✓ correct, red ✗ missed/wrong, grey ? extras
- [x] Animated SVG score ring (radius 34, circumference ~213.6) with stroke-dasharray transition + counting digit (0 → score over 1s)
- [x] Score-tier colour: forest ≥80, gold ≥50, amber otherwise
- [x] Transcript echoed back in monospace ("You said …"), with original target shown above the ring
- [x] Random British-English tip drawn from 5-item pool (t / r / a / th / rhythm) under the result
- [x] Safari + iOS detection → shows "For best experience, use Chrome or Edge" notice
- [x] Microphone-permission errors handled (`not-allowed`, `no-speech`, `audio-capture`, `aborted`) with friendly inline error + Retry button
- [x] No new npm dependencies, no backend changes, single-file index.html structure preserved
- [x] Reuses existing design tokens (forest/gold/cream/mono) so the panel matches the rest of the reading page

**Files changed:**
- index.html (v1.4.2 -> v1.4.4, AI Pronunciation panel rewritten + new CSS + new IIFE script)
- VERSION (1.4.2 -> 1.4.4)
- CHANGELOG.md (added v1.4.4 entry)
- WORKLOG.md (added Session 19)

**Pending / Next session:**
- [ ] Hook score result into Supabase progress (save pronunciation_score per lesson)
- [ ] Source target sentences from the actual book PDF / lesson rather than a static pool
- [ ] iOS / Safari fallback path (e.g. record-and-upload + server-side scoring) — currently shows browser warning only

---

## 2026-04-29 | Session 19.5 (off-repo) | Whisper batch transcription

**Objective:** Populate `lessons.commentary_text` for all books using OpenAI Whisper, so subsequent features (pronunciation, search, content audit) can reference the spoken commentary as data.

**Workspace:** `C:\Users\sergi\readii-transcribe\` (deliberately outside the website repo — one-shot tooling, not part of the deploy).

**Completed:**
- [x] One-shot script `transcribe.js` (Node, no new website deps): downloads from Supabase Storage `readii-content` bucket, calls Whisper with `lang=en`, brand-aware prompt, `response_format=verbose_json` to capture duration without ffmpeg
- [x] 242 lessons transcribed (238 first pass + 4 retry after format sniffing)
- [x] 4 mis-extensioned files (M4A bytes labelled .mp3) handled by adding magic-byte container detection
- [x] Total cost: $3.564 (whisper-1 @ $0.006/min, 9h45m of audio); wall clock 28 min
- [x] Brand-name audit: 240/242 transcripts contain "Readii" correctly spelled, 0 contain phonetic mis-spellings
- [x] 139 unprocessed lessons all have `commentary_audio_url = ''` (empty string) — neither NULL nor 'EMPTY'; flagged to user as data-hygiene cleanup

**Notes:**
- Script is self-contained: `.env` with API keys lives only in the workspace; no secret ever entered the website repo or git history
- Re-runnable: `commentary_text IS NULL` filter means a re-run automatically picks up any rows that fail or are added later

---

## 2026-04-29 | Session 20 | v1.5.0

**Objective:** Replace the static 5-sentence sample pool in the AI Pronunciation panel with lesson-specific English practice sentences mined from `commentary_text`.

**Completed (Phase 1 — off-repo data):**
- [x] Migration: `ALTER TABLE lessons ADD COLUMN english_excerpts JSONB` (run by user via Supabase SQL Editor)
- [x] Off-repo extractor `C:\Users\sergi\readii-transcribe\extract-english.js`
- [x] Tokeniser: replaces all CJK characters and CJK punctuation with hard splits, then sentence-splits each English run on `[.!?]\s+`, then filters
- [x] Quality filters (kept all 4 from the proposal): trivial-only ("ok / yeah" etc) drop, spelling-run drop (>20% single-letter tokens), number-heavy drop (<70% alphabetic tokens), auto-attach sentence-end period when Whisper truncated it next to Chinese
- [x] Result: 242/242 processed, 0 errors, 1 328 sentences total, avg 5.49 per lesson (max 8); 1 lesson had 0 (Baby Pictures — pure Chinese commentary), 18 lessons had only the Larry intro

**Completed (Phase 2 — frontend):**
- [x] Added `english_excerpts` to the `openBook()` SELECT in index.html
- [x] Refactored the v1.4.4 pronunciation IIFE: extracted rendering into `renderSentences()`; renamed `sentencePool` → `defaultPool` to clarify it's now a fallback
- [x] New public hook `window.setReadiiPracticeSentences(excerpts)` — falls back to the 5-sentence sample pool if `excerpts.length < 2` (chosen by user over strict spec to avoid sparse single-line panels)
- [x] `openBook()` calls the hook after loading the lesson — panel re-renders with that lesson's excerpts, label updates accordingly
- [x] Added small hint label above the sentence list ("Practice with sentences from this lesson's commentary." / "Practice with British English sample sentences.") — bilingual EN/ZH, uses existing `--ink3` token

**Verified end-to-end:** Bubbles (Heinemann G1) Day 1 → 7 lesson-specific excerpts render, label switches to lesson-specific.

**Files changed:**
- index.html (v1.4.4 → v1.5.0): SELECT extended, IIFE refactored with public hook, source-label element + CSS
- VERSION (1.4.4 → 1.5.0)
- CHANGELOG.md (added [1.5.0] entry)
- WORKLOG.md (this session + the off-repo Session 19.5)

**Off-repo files (not in git, intentionally):**
- `C:\Users\sergi\readii-transcribe\extract-english.js`
- `C:\Users\sergi\readii-transcribe\migration.sql`

**Pending / Next session:**
- [ ] Normalise the 139 `commentary_audio_url = ''` rows to NULL or 'EMPTY' so future tooling treats them consistently
- [ ] Consider re-running the extractor whenever new commentary_text rows arrive (cron / webhook)
- [ ] Hook pronunciation score result into Supabase progress (carried over from v1.4.4)

---

## 2026-04-29 | Session 21 | v1.6.0

**Objective:** Build a standalone AI Voice Coach tab in the app — 5 British English pronunciation modules with progress tracking, reusing the v1.4.4 Web Speech scoring engine.

**Completed:**
- [x] DB migration: new `pronunciation_attempts` table (user_id, source, module_id, lesson_id, sentence, transcript, score, created_at) with composite indexes and RLS (users read/insert own rows only)
- [x] Speech engine refactored from single-container IIFE → `window.ReadiiSpeech.attach(containerEl, { onScore })`. Recognition state stays global (only one mic at a time); each container has its own sentence list and result panel; recognition cleanly cancels if a render swap happens mid-recording
- [x] Renamed score-related DOM IDs to classes (`.score-arc`, `.score-text`, `.sr-close-btn`) so multiple result panels can coexist without ID collisions
- [x] Reading panel preserved: still mounts via `ReadiiSpeech.attach(#ai-pron-card)`; `window.setReadiiPracticeSentences()` from v1.5.0 still works
- [x] Sidebar wiring: `Reading Library` and `AI Voice Coach` items now have IDs and `onclick="showAppView(...)"`; placeholder "3" badge removed; `setActiveNi()` toggles `.act` class
- [x] Voice Coach view: home (5 module cards) + detail (intro + 6 sentence cards + footer with best/attempts) — both mounted in the same `.acon` and switched by toggling display
- [x] 5 modules hardcoded into `VOICE_COACH_MODULES` (broad_a, non_rhotic_r, th_voiced, yod, short_o), each with 6 sentences from the brief, an intro paragraph, and an icon
- [x] `loadVoiceCoachStats(force)` aggregates best/attempts per module via Supabase REST (`source='voice_coach'`); cached, invalidated after each insert
- [x] `logVoiceCoachAttempt({ moduleId, sentence, transcript, score })` insert; silently no-ops for guest users
- [x] Top breadcrumb updates with view (`Reading Library` / `AI Voice Coach` / `AI Voice Coach · Broad A`)
- [x] Mobile-friendly: VC modules collapse to single column under 640px; detail title/footer adapt
- [x] Smoke test: insert + readback + cleanup against a real auth user (huangemma60@foxmail.com) — passed

**Findings (worth flagging):**
- The `CHECK (score BETWEEN 0 AND 100)` constraint did not get applied during migration (the first run partially completed before the prose-line syntax error; second run hit `IF NOT EXISTS` and was a no-op). Frontend always produces 0–100 from `Math.round(...*100)`, so no runtime impact; just a missing defense-in-depth. Optional fix: `ALTER TABLE pronunciation_attempts ADD CONSTRAINT pa_score_check CHECK (score BETWEEN 0 AND 100);`

**Files changed:**
- index.html (v1.5.0 → v1.6.0): IIFE refactored, view-library wrap, view-voice-coach view, sidebar nav wiring, VC CSS, VC JS module + stats + logging
- VERSION (1.5.0 → 1.6.0)
- CHANGELOG.md ([1.6.0] entry)
- WORKLOG.md (this Session 21)

**Off-repo files (intentionally not in git):**
- `C:\Users\sergi\readii-transcribe\migration-voice-coach.sql`

**Pending / Next session:**
- [ ] Apply the CHECK constraint (optional one-line ALTER) — see Findings
- [ ] Mirror Voice Coach logging on the in-lesson Reading panel (`source='reading'` + `lesson_id`)
- [ ] My Progress tab — would naturally consume `pronunciation_attempts` to chart improvement over time
- [ ] Consider adding a "How-to-pronounce" audio sample per module (TTS or recorded)

---

## 2026-04-29 | Session 26 | v2.0.1

**Bug:** v2.0.0 Practice mode's "← Retry" button just nuked local state — user had no idea what they actually said vs. what the target was. Retry was a stamina test, not a learning step.

**Fix:**
- ReadiiSpeech public API extended with `tokenize`, `wordDiff`, `computeScore` so practice mode can call the same LCS aligner the Reading panel uses (no logic duplication)
- New `_wbAttemptBlockHtml(kind, target, score, transcript)`: renders a card with score-tier value + bilingual one-line feedback + "You said: …" transcript echo + (for sentence recordings) word-by-word LCS diff using `.wbp-diff-w.ok` (green) / `.wbp-diff-w.miss` (red) inline spans
- Word recordings (single token) skip the diff and show ✅ / ❌ next to the transcript; "Perfect match!" line appears when transcript tokens exactly match target tokens
- Empty transcript handled gracefully with "No speech detected. Try again." inline (no zero-score row pretending nothing happened)
- Retry semantics rewired: instead of clearing scores+transcripts, it now sets `sess.isLastAttemptView = true` which re-renders the same panel with `.is-last-attempt { opacity: .7 }` styling and a "Last attempt — re-record to update" banner. Bottom action buttons hide. Re-recording either kind clears the flag and returns the panel to normal styling
- Session state extended with `currentWordTranscript`, `currentSentenceTranscript`, `isLastAttemptView`; reset on each new card and on session start (`_wbStartPractice` and `_wbStartSingleWordPractice`)

**Files changed:**
- index.html (v2.0.0 → v2.0.1): ReadiiSpeech public API additions, new attempt-block CSS + diff CSS + last-attempt dim treatment, new `_wbAttemptBlockHtml` helper, rewritten `_wbRenderPracticeResult`, transcript storage in `_wbHandlePracticeScore`, reset paths in `_wbRenderPracticeCard` / `_wbStartPractice` / `_wbStartSingleWordPractice`
- VERSION (2.0.0 → 2.0.1)
- CHANGELOG.md ([2.0.1] entry)
- WORKLOG.md (this Session 26)

**Verified by:** 23 structural checks pass (renderer present, tokenize/wordDiff exposed, isLastAttemptView wired, perfect-match path, empty-transcript path, mobile diff scaling).

---

## 2026-04-29 | Session 25 | v2.0.0

**Objective:** Turn Word Bank from a flat 291-card list into a full practice product loop — card-by-card AI scoring, automatic Review queue, session summaries — plus build the Review tab on top of it.

**Completed (off-repo):**
- [x] `migration-review-queue.sql`: ADD COLUMN tags TEXT[]; CREATE review_queue with composite UNIQUE(user_id,word_id), index, RLS, 4 policies. Used DROP-then-CREATE for policies after the 42710 error pattern we hit on Word Bank v1.9.0 — ran clean

**Completed (frontend):**
- [x] `#view-word-bank` restructured into 4 sub-views: `#wb-home` (hub), `#wb-browse` (existing v1.9.0 grid, untouched logic, just wrapped + Back button), `#wb-practice` (card flow), `#wb-summary` (session complete). Internal navigator `_wbShowSubView()` toggles display
- [x] Hub page: 2 entry cards (Practice / Browse), live counters for Favorites and Review queue
- [x] Practice flow: single card with word, IPA, zh meaning, italic example sentence, 🔊 Hear-Word / 🔊 Hear-Sentence buttons; record zone with 🎤 Record-Word and 🎤 Record-Sentence buttons sharing one `ReadiiSpeech.attach()` instance
- [x] Speech engine reused with no rendering side-effects: practice container has no `.speech-result`, so engine's renderResult bails and only fires `onScore` callback. Custom result panel renders both scores + tier feedback once captured
- [x] `_wbHandlePracticeScore` distinguishes word vs sentence by matching `info.sentence` to the current card's word/example_sentence; logs to `pronunciation_attempts` with `source='word_bank'`; auto-adds to `review_queue` when word score <50 (upsert ignoreDuplicates so re-adds don't churn); updates `best_score_since_added`; graduates (deletes row) when best ≥80
- [x] Tier feedback messages bilingual (≥80 / ≥50 / <50); ≥50 line uses 💪 + "Good try!", <50 uses 🔄 + "every expert was once a beginner"
- [x] Bottom actions appear after first score: ⭐ Save / 🔁 Add to Review / ← Retry; Next Word → enables only when both scored
- [x] Session: random mode = up to 5 review queue + fill to 20 random; review mode = full queue (capped 20). Single-word mode for ▶ Go from Review list
- [x] Session-complete card: emoji + "You practised N words" + word avg / sentence avg / words-added-to-review counts; Practice Again / Back to Word Bank
- [x] **Review tab** (`#view-review`): list with word, IPA, zh, "Added Xd ago", "Best: N/100", ▶ Go button per row; "Practice All Review Words" CTA; "🎓 N words mastered" footer (proxy: distinct word_bank words with any ≥80 score from word_bank source)
- [x] Sidebar `Review` item now has `id="ni-review"` and `onclick="showAppView('review')"`; `showAppView()` dispatch table extended with `review` + breadcrumb
- [x] **TTS-vs-recording mutex**: `ReadiiSpeech.stop()` + `isActive()` exposed; capture-phase listener on practice sentence-list stops TTS before engine starts recording; `_wbPlayHear` checks `ReadiiSpeech.isActive()` and stops any active mic before TTS plays
- [x] Mobile-responsive: hub grid collapses to 1-col under 600px; practice card padding/word size scaled down; review row collapses

**Files changed:**
- index.html (v1.9.0 → v2.0.0): 4 sub-views, #view-review, hub CSS, practice CSS, summary CSS, review CSS, ~600 lines of new JS (hub, browse refactor, practice flow, review tab, single-word path, mutex)
- VERSION (1.9.0 → 2.0.0)
- CHANGELOG.md ([2.0.0] entry)
- WORKLOG.md (this Session 25)

**Off-repo files (intentionally not in git):**
- `C:\Users\sergi\readii-transcribe\migration-review-queue.sql`

**Pending / Next session:**
- [ ] Surface "graduated from review" count distinct from "mastered" — would need a soft-delete `graduated_at` column on review_queue if we want strict semantics
- [ ] Wire `tags TEXT[]` to a tag UI in Browse mode
- [ ] Per-card retry that re-fetches Whisper feedback details (currently retry just clears local scores)

---

## 2026-04-29 | Session 24 | v1.9.0

**Objective:** Build a Word Bank tab — curated reference list of British English pronunciation words, organised by Voice Coach module, each playable via TTS, searchable, with per-user favourites.

**Completed (off-repo data pipeline):**
- [x] Migration SQL: `word_bank` + `user_word_favorites` tables, indexes, RLS on favourites (`migration-word-bank.sql`)
- [x] Hit a transient `42710 policy already exists` from Supabase SQL Editor — switched to `DROP POLICY IF EXISTS` + `CREATE POLICY` pattern; ran clean
- [x] `seed-words.js` (idempotent upsert on `(word, module_id)`); ingested `words.json` (291 entries from user)
- [x] Per-module counts: broad_a 60 · non_rhotic_r 59 · short_o 61 · th_voiced 53 · yod 58 (target was 300 even-split; close enough)
- [x] `generate-tts.js`: OpenAI `tts-1-hd` with voice `fable` (British accent — replaced spec's `alloy` after flagging that alloy is the neutral/American-leaning voice; user agreed). Uploads to `readii-content/word-audio/{word_id}/word.mp3` and `sentence.mp3`. Resumable via `IS NULL` filter; 500ms throttle; 429-retry x3 with 30s wait
- [x] 1-row smoke test passed end-to-end (TTS 3s/clip, upload ok, DB writeback ok, signed URL retrievable)
- [x] Full TTS batch kicked off in background (~25-30 min, ~$0.50-0.90 budget)

**Completed (frontend Word Bank page):**
- [x] Sidebar `Word Bank` item now has `id="ni-word-bank"` and `onclick="showAppView('word-bank')"`
- [x] `showAppView()` dispatch table extended with `word-bank` (one-line addition + breadcrumb switch)
- [x] New `#view-word-bank` view: header, sticky filter bar (7 tabs + search input), card grid
- [x] 7 filter tabs (All / 5 modules / ★ Favorites) — pill-style matching existing `.stab` design
- [x] Live search across `word`, `ipa_gb`, `meaning_zh`, `example_sentence` (case-insensitive, 80ms debounce)
- [x] Word card design: serif word + mono IPA + zh meaning + italic-quoted example sentence (with left rule), 🔊 Word / 🔊 Sentence buttons, ⭐ favourite toggle. Mobile collapses to 1 col, tablet to 2, desktop 3
- [x] Single-audio playback: clicking play on one card stops any other playing clip; "Playing…" state with `--gold` highlight; resets on `ended` / `error`
- [x] Audio loaded as signed URLs via existing `getSignedUrl()` helper (1-hour expiry); buttons gracefully disabled with tooltip "Audio not ready yet" until TTS fills in URLs
- [x] Favorites: `user_word_favorites` insert/delete via RLS; when filter='Favorites' the unfavourited row disappears immediately; empty state shows "Tap ★ on any word card to save it here"
- [x] All copy bilingual via `data-en`/`data-zh`
- [x] 22 structural checks pass

**Files changed:**
- index.html (v1.8.0 → v1.9.0): #view-word-bank DOM + Word Bank CSS block + renderWordBank() + audio/favorite handlers + showAppView dispatch addition
- VERSION (1.8.0 → 1.9.0)
- CHANGELOG.md ([1.9.0] entry)
- WORKLOG.md (this Session 24)

**Off-repo files (intentionally not in git):**
- `C:\Users\sergi\readii-transcribe\migration-word-bank.sql`
- `C:\Users\sergi\readii-transcribe\seed-words.js`
- `C:\Users\sergi\readii-transcribe\generate-tts.js`
- `C:\Users\sergi\readii-transcribe\words.json`

**Pending / Next session:**
- [ ] Top up `th_voiced` / `non_rhotic_r` to ~60 each so all modules have parity (just append to words.json and re-run seed + generate-tts)
- [ ] Add Voice Coach module detail "Practice this word" deep-link (open Word Bank with module pre-filtered)
- [ ] Track "play count" per word as a passive engagement metric

---

## 2026-04-29 | Session 23 | v1.8.0

**Objective:** Build a "My Progress" tab so users can see their practice history and improvement, sourcing from the v1.6.0 `pronunciation_attempts` table.

**Completed:**
- [x] Sidebar `My Progress` item now has `id="ni-progress"` and `onclick="showAppView('progress')"`
- [x] `showAppView()` dispatch table extended with `progress` (one-line addition to views/navs maps + breadcrumb switch)
- [x] New `#view-progress` view inside `.acon` with header + 4 stacked sections
- [x] **Stats Overview** (Section 1): 4-up grid (Total / Avg / Best / Streak), collapses to 2x2 below 640px. Empty state shows `—` with a "Start practising to see your progress." hint
- [x] **Score Trend** (Section 2): hand-rolled SVG, viewBox 600x180, no chart library. 30-day window. Only days with ≥1 attempt get a data point (no zero-interpolation per spec). Y gridlines at 0/50/100, polyline in `--forest`, points have native `<title>` tooltip with localised date + avg + attempt count. <3 distinct days → hint text instead
- [x] **By Module Breakdown** (Section 3): 5 horizontal bars (one per VC module) using div+width per spec. Colour tier ≥80 forest / ≥50 gold / <50 amber; empty bars are dashed with "Not yet attempted" label
- [x] **Recent Attempts** (Section 4): last 10 rows, newest first. Friendly time (Today, HH:MM / Yesterday, HH:MM / N days ago / `MMM D`), source = VC module label or "Reading", score in tiered colour, sentence truncated to 50 chars with full text on hover (`title` attr). Card hidden entirely when there are no attempts
- [x] Streak helper `_pgComputeStreak` walks back from today (or yesterday if today's empty) counting consecutive day-keys; resets to 0 if neither today nor yesterday has data
- [x] Guest-user fallback: shows "Sign in to see your progress." instead of a partially-rendered state
- [x] All copy bilingual via `data-en`/`data-zh`; mobile-responsive across all 4 sections (recent attempts collapse from 4-col grid to 2-col stacked layout)
- [x] Sanity-checked against the live DB (currently 13 real attempts, all `voice_coach broad_a` from earlier testing)
- [x] 23 structural checks pass

**Files changed:**
- index.html (v1.7.1 → v1.8.0): #view-progress DOM + Progress CSS block + renderProgress() and 4 sub-renderers + showAppView dispatch addition
- VERSION (1.7.1 → 1.8.0)
- CHANGELOG.md ([1.8.0] entry)
- WORKLOG.md (this Session 23)

**Pending / Next session:**
- [ ] Add Reading-page logging too so the "By source" view distinguishes Reading vs Voice Coach attempts
- [ ] Consider per-module trend (small-multiple sparkline) once users have ~30+ attempts per module
- [ ] Word Bank / Review tabs (still placeholders)

---

## 2026-04-29 | Session 22.1 | v1.7.1 (hotfix)

**Bug:** After v1.7.0 deploy, clicking `Settings` in the sidebar signed the user out and redirected to the homepage instead of opening the Settings view.

**Root cause:** A v1.2.0 line in the inline `<script type="module">` block did:
```js
const settingsItem = document.querySelector('.ni:last-child')
if (settingsItem) settingsItem.onclick = handleSignOut
```
That ran *after* the inline HTML attribute `onclick="showAppView('settings')"` was parsed. Setting `.onclick` (the property) replaces an HTML-attribute onclick, so my new binding was silently overwritten and `handleSignOut` fired on every click.

**Fix:** Deleted the `handleSignOut` function and the `.ni:last-child` binding from the module script. Sign-out now lives only inside the Settings view (`#st-signout-btn`).

**Files changed:**
- index.html (v1.7.0 → v1.7.1): removed the stale handleSignOut + binding (~10 lines, replaced with a short explanatory comment)
- VERSION (1.7.0 → 1.7.1)
- CHANGELOG.md
- WORKLOG.md (this entry)

---

## 2026-04-29 | Session 22 | v1.7.0

**Objective:** Build a Settings page so users can see their account info, subscription status, set language preference, and sign out — replacing the previously-inert sidebar item.

**Completed:**
- [x] Sidebar `Settings` item now has `id="ni-settings"` and `onclick="showAppView('settings')"`
- [x] New `#view-settings` view inside `.acon` with 4 stacked cards: Profile, Subscription, Preferences, Account
- [x] Profile reads `_supabase.auth.getUser()` → email, formatted member-since (e.g. "April 2026" / "2026 年 4 月"), full user UUID (mono font, for support reference)
- [x] Subscription reuses existing `authGetSubscription()` from `assets/js/auth.js` → status pill (Free / Subscriber / Cancelled) with appropriate styling; renewal date shown if `subscription_end` is present; "Manage subscription →" button shows a "Coming soon" toast (Stripe Portal wiring deferred)
- [x] Preferences card with English / 中文 radio buttons that read current `localStorage['readii-lang']` and pre-select; "Save preferences" button persists choice and reloads the page
- [x] `setLang()` updated to accept `{ persist: true }` so saving from Settings writes to localStorage; a startup IIFE applies the saved language on page load before paint
- [x] Account card: Sign out button (red-border treatment) calls `_supabase.auth.signOut()` then redirects to `/`; Delete account button disabled with "Contact support to delete account"
- [x] `showAppView()` refactored from a 2-way branch to a small dispatch table (views/navs maps + breadcrumb switch) so adding more tabs later is a one-liner
- [x] Bilingual (data-en / data-zh) labels throughout; Mobile-responsive (cards collapse to single-column rows under 640px)
- [x] Guest-user fallback: Profile/Subscription show "please sign in" rather than crashing if `getUser()` returns null
- [x] 21 structural checks pass on the merged index.html

**Files changed:**
- index.html (v1.6.0 → v1.7.0): #view-settings DOM + Settings CSS block + renderSettings() + sign-out/save-prefs handlers + setLang persistence + showAppView dispatch refactor
- VERSION (1.6.0 → 1.7.0)
- CHANGELOG.md ([1.7.0] entry)
- WORKLOG.md (this Session 22)

**Pending / Next session:**
- [ ] Wire "Manage subscription →" to the actual Stripe Customer Portal session
- [ ] Allow editing display name / child name / child age (would need a writable form against `user_profiles`)
- [ ] Implement actual delete-account flow (auth user + cascade `user_profiles`/`pronunciation_attempts`/`progress`)
- [ ] My Progress / Word Bank / Review tabs (still placeholders)
