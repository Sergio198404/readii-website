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

**今日计划：**
- [ ] Stripe 账号注册，创建订阅产品
- [ ] 网站接入 Stripe 支付按钮
- [ ] Supabase Auth 邮箱注册登录
- [ ] 订阅成功后自动更新 user_profiles
- [ ] 登录后加载真实书库内容
