# Work Log — Readii Website

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
