# Changelog — Readii Limited Website

All notable changes to this project will be documented here.
Format: [Version] — YYYY-MM-DD

---

## [1.0.0] — 2026-04-09

### Added
- Complete landing page with bilingual EN/ZH support
- Hero section: AI platform positioning (removed "advisory" language)
- Platform features: 3-layer AI technology architecture
- Children's reading section with book library mockup
- About section: Kevin Su bio, company registration details (Co. No. 15002332)
- Pricing section: 3 tiers (£5/mo, £299 programme, custom enterprise)
- Footer with LinkedIn, address, VAT number
- Integrated product dashboard (logged-in view)
- Reading player with audio waveform UI
- AI pronunciation scoring panel
- Vocabulary panel with Chinese annotations
- Weekly progress tracker

### SEO
- Title tag: AI-Powered UK-China Learning Platform | Canterbury, UK
- Meta description targeting Home Office Google visibility
- Company registration number prominently displayed

### Notes
- Built for UK Innovator Founder Visa settlement application
- All "consultancy" language removed, replaced with "platform/programme" language
- LinkedIn links: placeholder — update before deploy

---

## [1.0.1] — 2026-04-09

### Fixed
- Updated company LinkedIn URL to linkedin.com/company/112639056
- Removed duplicate readii-new.html from project root

### Pending
- Personal LinkedIn handle to be confirmed by founder

---

## [1.0.2] — 2026-04-09

### Added
- Database schema: 6 tables (books, lessons, vocabulary, user_profiles, progress, streaks)
- Supabase Storage structure design (readii-content bucket)
- Seed example SQL for sample book insert
- Database README with table relationships and audio upload workflow

### Notes
- Schema designed for Supabase (PostgreSQL + Auth integration)
- 1 book → 1-4 lessons (by day), each lesson has reading + commentary audio
- Progress tracking per user per lesson, with AI pronunciation score field

---

## [1.0.3] — 2026-04-09

### Added
- Content scanner tool: tools/scan_content.js (Node.js)
- Python scanner reference: tools/scan_content.py
- Auto-generated Excel import template: tools/readii_content_import.xlsx

### Scan Results
- 93 books found across GK (72) and History (21)
- 36 books flagged with missing files (PDF/audio)
- G1, G2, US series not yet available

### Notes
- Scanner handles nested sub-phase folders (一阶段/二阶段) and loose file grouping
- Python not available on system, used Node.js + exceljs instead

---

## [1.0.4] — 2026-04-09

### Added
- Supabase upload script: tools/upload_to_supabase.js
- Bulk uploaded 239 books to Supabase (Storage + Database)
- Storage bucket: readii-content (private, auth required)
- .env for Supabase credentials, .gitignore for security

### Upload Results
- 372 books scanned (GK 72, G1 111, G2 161, History 21, US 7)
- 239 books with complete files uploaded — 0 failures
- 133 books skipped (missing PDF/audio)
- Database: 239 books rows + ~400 lesson rows created
- Storage: ~700 files (PDF + reading audio + commentary audio)

---

## [1.0.5] — 2026-04-09

### Fixed
- Kevin personal LinkedIn URL corrected to linkedin.com/in/xiaoyu-su-217a3b85/
- Sign in link → mailto:hello@readii.co.uk (until auth is built)
- Start free trial → mailto with subject line
- Enrol now → mailto with subject line
- All email addresses updated from readii.vip to readii.co.uk
- Hero card domain display: readii.vip → readii.co.uk
- Version comment updated to v1.0.5
