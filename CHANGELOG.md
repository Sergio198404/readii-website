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

---

## [1.1.0] — 2026-04-10

### Added
- Stripe Checkout integration: £5/mo subscription + £299 one-time programme
- Netlify serverless function: create-checkout.js (Stripe session creation)
- Auth module: sign up/in/out with Supabase Auth, bilingual login/signup modal
- Checkout handler: payment flow with success/cancel redirect
- Payment success banner (auto-dismiss)

### Changed
- "Start free trial" button → "Start subscription — £5/mo" (Stripe checkout)
- "Enrol now" button → "Enrol now — £299" (Stripe checkout)
- Sign in button → opens auth modal (was mailto)
- netlify.toml: added functions directory

### Notes
- Stripe Secret Key stored as Netlify environment variable (not in code)
- Stripe Publishable Key in assets/js/stripe-config.js (client-side, safe to expose)

---

## [1.3.3] — 2026-04-11

### Added
- Real progress tracking: reading_completed, commentary_completed saved to Supabase
- Streak system: daily streak tracking with consecutive day logic
- Auto-save: progress saved every 30 seconds during playback
- updateProgressPanel(): updates sidebar and right panel with real data
- Book completion badges: "Done" tag on completed books in library grid
- Completed books show "Re-read" button instead of "Listen"
- Commentary ended event saves commentary_completed

### Changed
- library.js: added loadStreak(), updateStreak() exports
- renderLibrary(): loads user progress, shows completion state per book
- initApp(): loads progress panel on login
- openBook() ended listeners: save progress + update streak + refresh panel

---

## [1.3.2] — 2026-04-11

### Added
- PDF viewer: iframe-based reader replaces mock text in reading panel
- openBook() generates signed URL for `books/{id}/book.pdf` and loads into iframe
- Placeholder state: "Select a book to start reading" with bilingual text
- Fallback: "PDF not available" message if signed URL fails or PDF missing

### Changed
- `.rpbody` CSS: padding removed, flex column layout for PDF to fill space
- Mock caterpillar text and vocabulary strip removed from reading panel

### Notes
- PDF path convention: `books/{book_id}/book.pdf` in Supabase Storage
- Actual PDF filenames in Storage may differ — check and adjust path if needed

---

## [1.3.1] — 2026-04-11

### Fixed
- Audio player now sticky at bottom of reading panel (always visible)
- openBook() scrolls to player and highlights it briefly on open
- Player background changed to white with forest-green top border + shadow

### Changed
- `.aplayer` CSS: position sticky, bottom 0, z-index 50, box-shadow

---

## [1.3.0] — 2026-04-11

### Added
- Commentary audio track: second audio element for Chinese tutor explanations
- Track toggle buttons (Reading / Commentary) in audio player, bilingual labels
- Seek control: click progress bar to jump to any position in audio
- Speed control: 0.75x / 1.0x / 1.25x / 1.5x connected to real audio playbackRate
- Articles section: /articles/ index page with 3 article cards
- First full article: "Why non-native English speakers struggle in British schools"
- Article page includes SEO meta tags, author bio, CTA to pricing
- Footer "Articles & Insights" link now points to /articles/

### Changed
- openBook() rewritten: dual audio track support, signed URL for both reading + commentary
- Progress bar and time display update from whichever track is active
- Speed button cycles through real playback rates (was cosmetic only)

### Notes
- Commentary track disabled if lesson has no commentary_audio_url
- Track switch preserves play/pause state and current speed
- Articles are static HTML pages (no CMS) — good for Google indexing

---

## [1.2.2] — 2026-04-11

### Fixed
- Audio playback now works with private Supabase Storage bucket
- openBook() generates signed URL before setting audio.src when path is not a full URL
- getSignedUrl() error message improved (English)

### Notes
- If `reading_audio_url` starts with `http`, used directly (already a public/signed URL)
- If it's a storage path (e.g. `gk/book-1/day-1-reading.mp3`), getSignedUrl() generates a 1-hour temporary link
- supabase-client.js cleaned up (no ES module export — stays as global script)

---

## [1.2.1] — 2026-04-11

### Added
- Real audio playback: openBook() fetches lesson audio from Supabase and plays via HTML5 Audio
- Play/pause button connected to actual audio element
- Progress bar updates in real-time during playback
- Auto-save progress to Supabase when audio finishes (reading_completed + duration)
- Player UI updates with book title, series, and day number on book open

### Notes
- Audio URLs come directly from Supabase `lessons.reading_audio_url`
- If audio is missing, user sees alert message
- Progress saved only for logged-in users
- `fmt()` helper reused from existing player code for time display

---

## [1.2.0] — 2026-04-11

### Added
- Library access control: `checkAccess()` checks user login + subscription status
- Real book library grid: loads all published books from Supabase
- Subscriber UI: ▶ Listen button for active subscribers
- Non-subscriber UI: 🔒 Subscribe button + subscribe banner
- Progress tracking functions: `loadProgress()`, `saveProgress()`
- Book card CSS: grid layout with hover effects
- Subscribe banner for free/guest users

### Changed
- library.js rewritten as ES module with access control logic
- index.html inline script now uses module imports from library.js
- App view book list replaced with responsive library-grid
- Navigation buttons update based on login/subscription state
- Settings sidebar item now triggers sign out

### Notes
- Guest → sees books with 🔒, prompted to subscribe
- Logged in (free) → same as guest
- Logged in (active subscription) → sees ▶ Listen on all books
- `openBook()` placeholder ready for audio player integration

---

## [1.1.1] — 2026-04-10

### Added
- Stripe Webhook: netlify/functions/stripe-webhook.js
- Auto-update user_profiles.subscription_status on payment success
- Handle checkout.session.completed (subscription + one-time payment)
- Handle customer.subscription.deleted (cancellation)
- Supabase JS added to functions dependencies

### Notes
- Webhook requires 3 Netlify env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, STRIPE_WEBHOOK_SECRET
- £5/mo subscription → 1 month access, £299 one-time → 6 months access
