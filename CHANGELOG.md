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

## [1.8.0] — 2026-04-29

### Added
- feat: My Progress page — stats, trend chart, module breakdown, recent attempts
- New left-sidebar tab "My Progress" — clickable, switches the main pane to a new `#view-progress`
- **Stats Overview:** 4-up cards — Total attempts, Average score, Best score, Practice streak (4-up on desktop, 2x2 on mobile)
- **Score Trend:** SVG line chart of last 30 days (no chart library). Y-axis 0/50/100 gridlines, only days with attempts get a point (no zero-interpolation), polyline in `--forest`, hover via native SVG `<title>` showing date + average + attempt count. Falls back to "Practise for a few more days to see your trend." hint when fewer than 3 distinct days have data
- **By Module Breakdown:** 5 horizontal bars (one per Voice Coach module) showing average score and attempt count. Bar colour tier: ≥80 forest / ≥50 gold / <50 amber. Modules with no attempts render as a dashed empty bar with "Not yet attempted" label
- **Recent Attempts:** last 10 rows, newest first — friendly time (Today / Yesterday / N days ago / `MMM D`), source label (Voice Coach module name OR "Reading"), score in tiered colour, sentence preview truncated to 50 chars with full text in `title` attribute. Hidden entirely if there are no attempts

### Changed
- `showAppView()` dispatch table extended with `progress` view and breadcrumb label
- All Progress page content is bilingual via `data-en` / `data-zh`

### Notes
- Frontend-only — no DB migration; data source is the existing `pronunciation_attempts` table from v1.6.0 (RLS already restricts each user to their own rows)
- Streak rule: counts consecutive days ending at today (or yesterday if today is empty); resets to 0 if neither today nor yesterday has an attempt
- Guest users see a "Sign in to see your progress." hint instead of a half-rendered empty state

---

## [1.7.1] — 2026-04-29

### Fixed
- Settings click no longer signs the user out and redirects to the homepage. A v1.2.0 module-script line `document.querySelector('.ni:last-child').onclick = handleSignOut` was still active and overriding the new inline `onclick="showAppView('settings')"` on the Settings sidebar item. Removed that binding (sign-out lives inside the Settings view itself in v1.7.0).

---

## [1.7.0] — 2026-04-29

### Added
- feat: Settings page — profile, subscription status, language preference, sign out
- New left-sidebar tab "Settings" — clickable, switches the main pane to a new `#view-settings`
- **Profile card:** email, member-since (formatted as "April 2026" / "2026 年 4 月"), user ID (mono, full UUID, for support reference). All read-only this release
- **Subscription card:** current plan pill (Free / Subscriber / Cancelled) — pulls `subscription_status` from `user_profiles` via the existing `authGetSubscription()` helper. Shows renewal/end date if available. "Manage subscription →" button currently shows a "Coming soon" toast (Stripe Customer Portal wiring deferred)
- **Preferences card:** language radio (English / 中文) — saves to `localStorage` key `readii-lang` and reloads the page so all `data-en` / `data-zh` spans update
- **Account card:** Sign out button (red border, calls `_supabase.auth.signOut()` then redirects to `/`); Delete account is disabled with "Contact support to delete account"

### Changed
- `setLang(l, opts)` now optionally persists to localStorage when called with `{ persist: true }`
- A startup IIFE reads `readii-lang` and applies it before paint, so the user's language sticks across visits
- `showAppView()` refactored from explicit branches to a small dispatch table — adding the third view (Settings) is one line
- Top breadcrumb updates with the active view (`Reading Library` / `AI Voice Coach` / `Settings`)
- Sidebar `Settings` item moved from no-op to clickable nav target

### Notes
- Frontend-only change; no new npm dependencies, no DB migration
- Guest users see Settings UI but with a "please sign in" notice in Profile/Subscription cards (writes are no-ops)
- Other sidebar tabs (My Progress, Word Bank, Review) still placeholders — out of scope this release

---

## [1.6.0] — 2026-04-29

### Added
- feat: AI Voice Coach — 5 British English pronunciation modules with progress tracking
- New left-sidebar tab "AI Voice Coach" — clickable, switches the main pane between the existing Reading Library and the new Voice Coach view
- New table `pronunciation_attempts` — per-attempt log (user_id, source ['voice_coach' | 'reading'], module_id, lesson_id, sentence, transcript, score, created_at) with RLS (users read/insert only their own rows)
- 5 modules, each with 6 sentences, an intro paragraph, and an icon: Broad A, Non-rhotic R, TH (voiced), Yod retention, Short O
- Voice Coach home page: module cards showing best score and attempt count per module (or "Not yet attempted" for unpractised modules)
- Voice Coach detail page: intro panel, 6 sentence cards, "Read aloud" mic button on each, score ring + word-level feedback + British tip (re-uses v1.4.4 Web Speech engine), footer with current best/attempts
- Each completed attempt is logged to `pronunciation_attempts` with `source='voice_coach'` and the module id; module home + detail footer auto-refresh on return

### Changed
- Speech engine refactored from a single-container IIFE into `window.ReadiiSpeech.attach(containerEl, { onScore })` — multiple containers can share one engine; recognition state stays global so only one mic recording at a time across the whole app
- Reading panel now mounts via `ReadiiSpeech.attach(#ai-pron-card)` — `window.setReadiiPracticeSentences()` from v1.5.0 still works exactly as before
- Renamed score-related DOM IDs to classes (`.score-arc`, `.score-text`, `.sr-close-btn`) so multiple result panels can render simultaneously without ID collisions
- Removed the placeholder "3" badge on the AI Voice Coach sidebar item (was static)
- Top breadcrumb updates as the user navigates between Library / Voice Coach home / Voice Coach detail

### Notes
- Frontend-only change; no new npm dependencies
- Migration SQL is off-repo (`C:\\Users\\sergi\\readii-transcribe\\migration-voice-coach.sql`) — run via Supabase SQL Editor before deploying
- Sign-in is required to log attempts and see stats; guest users still see the Voice Coach UI but writes silently no-op
- Other sidebar tabs (My Progress, Word Bank, Review, Settings) intentionally untouched in this release

---

## [1.5.0] — 2026-04-29

### Added
- feat: AI pronunciation practice now uses lesson-specific English excerpts extracted from commentary (242 lessons)
- New `lessons.english_excerpts` JSONB column — array of 0–8 English practice sentences per lesson, mined from `commentary_text`
- Reading page: when a book is opened, the AI Pronunciation panel re-renders with sentences from that lesson's commentary instead of the static sample pool
- New panel hint label: "Practice with sentences from this lesson's commentary." (lesson-specific) / "Practice with British English sample sentences." (fallback)
- Public window hook `setReadiiPracticeSentences(excerpts)` — called by `openBook()` to swap the practice list when a lesson loads

### Changed
- `openBook()` SELECT now includes `english_excerpts` alongside the existing lesson fields
- Pronunciation IIFE refactored: sentence rendering factored into a reusable `renderSentences()`; default sample pool retained as `defaultPool`
- Fallback threshold: lessons with fewer than 2 excerpts fall back to the 5-sentence sample pool so the practice block is never sparse

### Notes
- 242/242 transcribed lessons processed by the off-repo extractor; 1 328 sentences total (avg 5.49/lesson, max 8)
- Extractor lives in a separate workspace (`C:\\Users\\sergi\\readii-transcribe\\extract-english.js`) — not part of the website repo
- Quality filters: drops trivial-only ("ok / yeah"), spelling-runs (>20% single-letter tokens), number-heavy runs (<70% alphabetic tokens); auto-attaches sentence-end period when Whisper drops it adjacent to Chinese
- 18 lessons yielded only the Larry-intro line; those use the fallback pool at runtime

---

## [1.4.4] — 2026-04-29

### Added
- feat: AI pronunciation assessment using Web Speech API (browser-native, en-GB)
- Reading page: 5 preset British English sentences (Level 2 reader, hungry-caterpillar pool) under the AI Pronunciation panel
- Each sentence has a "Read aloud" mic button — uses `SpeechRecognition` (`webkitSpeechRecognition` fallback) with `lang='en-GB'`
- Listening UI: pulsing mic animation, 10-second max capture, auto-stop on silence/end
- Scoring: case- and punctuation-insensitive exact-word match against target → 0–100 score
- Word-level diff via LCS alignment: green ✓ correct, red ✗ missed, grey ? extra
- Animated SVG score ring (0 → score over 1s) with score-tier colour (forest / gold / amber)
- Transcript shown in monospace ("You said …") plus the original target sentence
- British-English coaching tip randomised from a 5-item pool (t/r/a/th/rhythm)
- Browser compatibility: Safari + iOS show "For best experience, use Chrome or Edge" notice
- Microphone-permission failures (`not-allowed`, `no-speech`, `audio-capture`) show inline error with Retry button

### Notes
- Fully client-side, no backend, no new npm dependencies, single-file HTML structure preserved
- Replaces the previous static demo recbtn / scored / fblist mockup in the AI Pronunciation panel
- Uses existing design tokens (`--forest`, `--gold`, `--cream`, `--mono`, etc.) for visual consistency

---

## [1.4.3] — 2026-04-17

### Changed
- Replaced third-party brand references on all user-facing pages (index, About, Pricing, Articles)
- `Heinemann GK/G1/G2` → `GK Series` / `G1 Series` / `G2 Series`
- `Heinemann · Level …` → `British Reader · Level …`
- Other `Heinemann` mentions → neutral descriptions (e.g. "British reader series"); Chinese `海尼曼` → `英式分级阅读`
- Article bodies (from-beijing-to-canterbury, why-ai-is-changing-english-learning) updated accordingly
- Added internal `displaySeriesName()` mapping in library JS so existing DB `series` values still render and filter correctly under the new names

---

## [1.4.2] — 2026-04-14

### Added
- Article: uk-china-trade-communication-gap.html (UK-China Business)
- Article: from-beijing-to-canterbury.html (Founder Story, Shanghai origin)

### Fixed
- Articles index: third article title changed from "Beijing" to "Shanghai"
- Matching excerpt updated to reference Shanghai EdTech background

---

## [1.4.1] — 2026-04-14

### Fixed
- netlify.toml: `/articles/*` and `/privacy-policy.html` were being caught by the `/*` → `index.html` wildcard, returning the landing page instead of the actual files
- Added specific redirect rules before the wildcard so Netlify matches static HTML paths first

---

## [1.4.0] — 2026-04-14

### Changed
- Footer Connect column simplified: LinkedIn, email, Privacy Policy only
- Removed placeholder WeChat/Xiaohongshu/Douyin links (# anchors)
- Privacy Policy moved from Company column to Connect column

---

## [1.3.9] — 2026-04-14

### Added
- About page: new paragraph on Readii's AI transition (teachers → AI delivery)
- privacy-policy.html: full UK GDPR compliant privacy policy
- Footer "Privacy Policy" link (EN/ZH bilingual)

### Notes
- AI narrative explains the pivot from live teacher sessions to scalable AI
- Privacy policy covers: data collection, children's data, rights, retention, ICO complaints

---

## [1.3.8] — 2026-04-13

### Added
- Working series filter tabs in library: All / GK / G1 / G2 / History / Science
- filterBooks() shows/hides book cards by series
- Book cards now carry data-series attribute for client-side filtering
- Subscribe banner auto-hides when filter is not "All"

### Changed
- Library header redesigned with serif title and pill-style tabs
- Grid minimum column width reduced to 180px for denser layout

---

## [1.3.7] — 2026-04-11

### Changed
- Footer redesigned: dark background → light cream (var(--cream2)) with dark text
- All footer text now uses theme ink/ink2/ink3 colors for consistency
- Footer links hover to forest green instead of white
- Grid divider and bottom border use var(--border) instead of rgba white

---

## [1.3.6] — 2026-04-11

### Fixed
- Footer background darkened (#0F0E0C) for better contrast
- All footer text opacity increased: logo .88→.95, desc .32→.55, addr .22→.45, headings .22→.4, links .42→.65, legal .16→.35
- Footer link hover brightened to .95

---

## [1.3.5] — 2026-04-11

### Fixed
- Footer copyright year corrected: 2025 → 2026
- For Children section: replaced fake book titles with real series names (GK, G1, History, Science)
- Removed specific fictional book references (The Very Hungry Caterpillar etc.) from landing page mockup

### Notes
- Sign in button already had correct showAuthModal() binding — no change needed
- Social media links (WeChat, Douyin, Xiaohongshu) remain as # placeholder — to be added later

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
