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

## [2.4.1] — 2026-04-30

### Fixed
- fix: Formspree endpoint configured — replaced `YOUR_FORMSPREE_ID` placeholder with the live form ID `mzdopqda`. Lead submissions now trigger email-on-submit to hello@readii.co.uk
- Added `_replyto: lead.contact` to the email POST body so replying to the notification email goes back to the lead's WeChat/email rather than to Formspree's no-reply address

---

## [2.4.0] — 2026-04-30

### Added
- feat: **UK Culture Programme — in-context lead capture**. After a learner has scored 8+ unique sentences in specific levels, an inline (non-modal) service-recommendation card appears below the sentence list with a 3-field form (Name / WeChat or Email / Best time to contact)
- New table `leads` (anonymous-allowed insert via RLS, service-role-only select) — see `database/migration-leads.sql`
- 7 trigger entries in `UKC_LEAD_TRIGGERS`:
  - `setup_l1` → company_formation
  - `setup_l3` → vat_registration
  - `setup_l4` → hr_sponsor_licence
  - `education_l3` → school_application
  - `daily_l4` → bank_account
  - `email_l5` and `meeting_l5` → business_coaching
  Each entry has bilingual headline + body copy
- Trigger logic: card surfaces when `uniqueIdx.size >= 8` AND a per-level `localStorage` flag (`readii-lead-shown-<id>_l<n>`) is unset. The check runs on level open AND after every onScore-driven progress refresh, so the card appears the moment the user crosses the 8-sentence threshold
- Submit flow: writes to `leads` (anonymous user_id allowed), then fires-and-forgets a Formspree POST for email-on-submit. After success, form swaps to "✅ Thank you! We'll be in touch soon." and the localStorage flag is set
- "✕ Not interested" sets the localStorage flag and hides the card without writing to DB — same dismiss-once behaviour
- Email notification: `FORMSPREE_ENDPOINT` constant at the top of the lead block, with placeholder `YOUR_FORMSPREE_ID`. If the placeholder is detected, the email step is silently skipped (lead still saves to DB). To enable: register at formspree.io, point a form at hello@readii.co.uk, replace the ID

### Changed
- `openUkCultureLevel()` now binds lead-card handlers (one-time), hides any stale card from a previous level, and calls `_ukcMaybeShowLeadCard()` so a returning user with 8+ already-scored sentences sees the card immediately
- onScore handler in the level detail page calls `_ukcMaybeShowLeadCard()` after the meta refresh — card appears the moment the threshold is crossed
- Both UK Culture back buttons (level → module, module → group) and `showAppView` (when leaving any UK Culture route) call `_ukcHideLeadCard()` for clean navigation

### Notes
- All `leads` writes wrapped in try/catch — table-missing or RLS-failure paths show a friendly "Submission failed, please try again" inline error rather than crashing
- Anonymous lead capture works (user_id is nullable) — useful for users who happen to be signed out when triggered
- Mobile layout: form fields stack to single column, Submit button goes full-width, Dismiss aligns right
- Per-browser localStorage: a user clearing browser data will see the cards again. This is acceptable — users who clear data are rare, and a returning user who already submitted/dismissed seeing the card again is annoying but not broken (`Anyone insert leads` policy means duplicate submissions are harmless and easy to dedupe by Kevin in the dashboard)

---

## [2.3.1] — 2026-04-30

### Added
- feat: My Progress — new **Reading level** stat card (📖) showing the user's current `user_profiles.reading_level` as "Level 1/2/3" (bilingual: "第 N 级"). Sits alongside the existing Reading streak card so users see both their adaptive level and their daily-book consistency at a glance
- Total Stats Overview cards: 7 (`auto-fit minmax(140px, 1fr)` grid already wraps cleanly)

### Changed
- `_pgRenderDailyBookStats(user)` now fetches `user_daily_book` and `user_profiles.reading_level` in parallel (`Promise.all`-style — both queries dispatched together and awaited separately so a failure in one doesn't block the other)

### Notes
- Defaults to "Level 1" if the profile row is missing or the column is null (consistent with `getDailyBook()` fallback)

---

## [2.2.1] — 2026-04-30

### Added
- feat: **UK Culture Programme — 🔊 Listen buttons activated** with native British TTS audio (the 200 fable mp3s generated by the transcribe workspace)
- New table read: `uk_culture_audio` (module_id, level_num, sentence_idx → relative storage path). 60-second signed URLs minted client-side via `_supabase.storage.from('readii-content').createSignedUrl(path, 60)`
- Batch URL fetch on Level open: `_ukcLoadAudioUrls(moduleId, levelNum)` queries 10 rows + signs all URLs in parallel via `Promise.all`. After the cards are rendered, `_ukcActivateListenButtons()` populates each button's `data-audio-url` and removes `disabled`. If `uk_culture_audio` has no rows for that level (audio not yet generated), buttons stay in the "(soon)" state — no error
- Click → play with TTL refresh: clicking 🔊 plays via `new Audio(url)`. If `play()` rejects (likely TTL expired after 60s), the handler re-fetches the path from `uk_culture_audio`, re-signs the URL, retries playback once. If it still fails, button drops back to idle
- Button state machine: idle (🔊 Listen) → playing (⏸ Playing…) → idle on `ended`. Clicking the same button while playing stops it. Clicking a different Listen button stops the previous and plays the new one
- TTS-vs-recording mutex (matches Word Bank pattern): clicking 🔊 stops any active mic via `ReadiiSpeech.stop()`; clicking 🎤 stops any playing audio via `_ukcStopAudio()`. Implemented with a single delegated click listener on `#ukc-sentence-list` (one-time bind via `_ukcListenBound` flag)
- Navigation cleanup: `_ukcStopAudio()` called from both UK Culture back buttons (level → module, module → group) and from `showAppView()` when leaving any UK Culture route

### Notes
- All `uk_culture_audio` reads + storage signs are wrapped in try/catch; if the table doesn't exist or the bucket is misconfigured, the buttons stay in their "(soon)" state and the rest of the level page works normally
- Why 60s TTL: matches the Listen button's expected interaction window. If the user opens a level and waits >60s before clicking, the first click triggers the refresh path (one extra round-trip, transparent to the user)
- The button content is rebuilt from scratch on each state change (idle/playing/soon) via small render helpers — keeps state transitions readable rather than juggling class flags

---

## [2.3.0] — 2026-04-30

### Added
- feat: **Reading Library — daily-book mode** (the new default landing). One book per day, per user, with adaptive difficulty
- New table `user_daily_book` (user_id + assigned_date PK, RLS-scoped, 3 policies) — see `database/migration-daily-book.sql`
- New `user_profiles` columns: `reading_level INT 1-3 DEFAULT 1`, `books_read_count INT DEFAULT 0`
- Daily card on `view-library`: shows today's date, book cover, title (EN+ZH), series, total days, "▶ Start Reading" CTA. After completion the CTA flips to "↺ Re-read" with a "completed today" badge
- Daily-book stats line below the card: 📚 Books read · 🔥 Streak (n days)
- "Browse all books →" secondary link on the daily card switches to the original library grid (unchanged); "← Back to today" returns
- **Difficulty feedback panel** revealed in the reading panel after the user records their first sentence for today's book. Three buttons: 😓 Too hard / 👍 Just right / 😊 Too easy. After submit: card shows "Thanks! Come back tomorrow for your next book."
- Difficulty feedback adjusts `user_profiles.reading_level` (clamped 1-3): too_hard → −1, too_easy → +1, just_right → unchanged. Tomorrow's `getDailyBook()` reads the new level
- `getDailyBook()` selects from `books WHERE level IN (...) AND is_published = true AND id NOT IN (already-assigned)`, random pick from up to 20 candidates. Fallback when the tier is exhausted: re-pick the earliest book (no error state)
- **Reading-panel pronunciation logging**: previously the Reading panel's `ReadiiSpeech.attach()` had `onScore: null` and recorded nothing to `pronunciation_attempts`. Now it logs with `source='reading'`, `module_id=<current_book_id>`. This both feeds My Progress and is what triggers the daily-book completion flag
- My Progress: two new stat cards — **Books read** (count of `user_daily_book.completed=true`) and **Reading streak** (consecutive days walking back from today/yesterday). Stats grid switched to `auto-fit minmax(140px,1fr)` so 6 cards wrap cleanly on any width

### Changed
- `view-library` restructured into two sub-views: `#library-daily` (default) and `#library-browse` (existing grid, preserved). `showAppView('library')` always lands on daily mode and refreshes the card on entry (handles day rollover)
- `window.openBook(bookId)` now records `_currentReadingBookId` so subsequent reading-panel attempts know which book they belong to

### Notes
- The DB migration (`database/migration-daily-book.sql`) is non-blocking: code reads/writes are wrapped in try/catch. The app remains functional before the SQL is run; the daily card will show "Daily book is not set up yet" until the table exists
- The level mapping `{1:[1], 2:[2], 3:[3]}` assumes `books.level` is already a 1/2/3 tier. If your seed uses a different distribution, edit `levelMap` in the inline script and the new card content will adapt
- Existing "Practice streak" stat preserved as-is (sourced from `pronunciation_attempts.created_at` distinct days). Reading streak is independent and counts only daily-book completion days

---

## [2.2.0] — 2026-04-30

### Added
- feat: **UK Culture Programme** — 4 modules (Email · Meeting · Education · Daily Life · Setup), 5 levels each, **200 British English sentences** with progressive unlock
- New table `uk_culture_progress` (per-user, RLS-scoped, `UNIQUE(user_id, module_id, level_num, sentence_idx)`) — see `database/migration-uk-culture-progress.sql`
- Progressive unlock logic: Level 1 always open; Level N unlocks when Level N-1 has ≥8 unique sentences attempted AND average score ≥60. The level row shows the lock status, what's needed, and links straight to the unlocked level
- Level row badges: ✓ Done (10/10) · ⚡ Active (unlocked, in progress) · 🔒 Locked (with explanation)
- Per-sentence cards: 🎤 Record button (reuses `ReadiiSpeech.attach()`), score + tier feedback + transcript + word-by-word diff (shares the `tokenize`/`wordDiff` helpers added in v2.0.1). Cards turn green and show best score once attempted
- 🔊 Listen button on each card with `data-module` / `data-level` / `data-idx` / `data-audio-url` placeholders, currently `disabled` with "(soon)" suffix — Step 2 (separate task) will populate the audio URLs
- Each scored attempt writes to **two** tables: `uk_culture_progress` (upsert on conflict, used for unlock logic) and `pronunciation_attempts` with `source='uk_culture'` and `module_id='<id>_l<level>'` (used for My Progress page)
- New CTA card at the bottom of every group home: "Ready for personalised coaching?" + From £2,000 + mailto:hello@readii.co.uk

### Changed
- **Sidebar nav restructured** into 3 groups:
  - **LEARN**: Reading Library · AI Voice Coach · Word Bank · My Progress (Word Bank moved here from Vocabulary)
  - **UK CULTURE PROGRAMME**: Business · Education · Daily Life · Setup & Establishment · Review (4 new module entries + Review)
  - **ACCOUNT**: Settings
- Old `view-uk-business` (4 flat scenes × 5 sentences) removed — content reorganised into the new 5-level structure under Business and Daily Life modules. The "Pitch" scene is folded into Setup → Growth & Expansion
- Old `UK_BUSINESS_SCENES` data, `loadUkBusinessStats`/`logUkBusinessAttempt`/`renderUkBusinessHome`/`openUkBusinessScene` functions, and `.ukb-*` CSS removed
- `showAppView()` dispatch table extended with 4 new routes (`ukc-business`/`ukc-education`/`ukc-daily`/`ukc-setup`), all sharing one `view-uk-culture` container with internal sub-states (group home → module home → level detail)
- Breadcrumb shows the full path: "UK Culture · Business · Professional Email Writing · Level 2"
- My Progress upgrade banner CTA now routes to `ukc-business` (was `uk-business`)
- `_pgSourceLabel()` extended to recognise `uk_culture` source — Recent Attempts shows e.g. "Professional Email Writing · L2"

### Notes
- The DB migration is non-blocking: code reads/writes are wrapped in try/catch, so the app remains functional before the SQL is run (writes silently fail until the table exists). Run `database/migration-uk-culture-progress.sql` in Supabase SQL Editor when ready
- TTS audio URLs are deliberately blank in this release — the Step-2 batch script in the transcribe workspace will populate them
- 200 sentences = 4 modules × 5 levels × 10 sentences. Setup & Establishment is the cross-border-founder play; Education targets visa-applicant parents; Daily Life is the broad onboarding funnel

---

## [2.1.0] — 2026-04-29

### Added
- feat: UK Business Communication Programme tab — 4 scenes (Email / Meeting / Pitch / Daily Life), each with 5 British professional sentences scored via existing Web Speech API (`source='uk_business'` in `pronunciation_attempts`)
- New left-sidebar tab **UK Business** (🇬🇧) between Word Bank and Review, switching to `#view-uk-business`
- Scene home grid mirrors Voice Coach card pattern: per-scene best score + attempt count, hover lift, bilingual title/description
- Scene detail page reuses `ReadiiSpeech.attach()` — same scoring, transcript echo, retry, last-attempt diff as Voice Coach
- Bottom CTA card on Scene home: "Ready for personalised coaching?" with mailto:hello@readii.co.uk and From £2,000 price line
- feat: My Progress upgrade banner — appears between Score Trend and By Module when total attempts ≥ 10 AND average score ≥ 60. Shows the user's actual N and X stats, links to UK Business tab via in-app navigation (not mailto), dismissible via ✕ which writes `localStorage.readii-upgrade-dismissed=true`

### Changed
- `_pgSourceLabel()` extended to recognise `uk_business` (with per-scene title) and `word_bank` sources for the Recent Attempts list
- `showAppView()` dispatch table extended with `uk-business`; breadcrumb updates per active view

### Notes
- No new tables — all UK Business attempts log to existing `pronunciation_attempts` with `source='uk_business'`, `module_id=scene.id` ('email' / 'meeting' / 'pitch' / 'daily')
- Banner condition is computed client-side from already-fetched attempts; no extra round-trip
- This connects the AI practice flywheel to the high-margin UK Business Programme — Readii's dual-engine business model now has a visible in-product path

---

## [2.0.1] — 2026-04-29

### Fixed
- fix: Word Bank Practice retry now shows transcript and word-level diff from last attempt
- The result panel now displays the full transcript ("You said: …") below each score — for word recordings as a single ✅/❌ check, for sentence recordings as a word-by-word diff using the v1.4.4 LCS alignment (green ✅ correct words, red ❌ missed/wrong words)
- "Perfect match!" line shown when transcript exactly matches the target (case- and punctuation-tolerant)
- Empty transcript ("No speech detected") gets a friendly inline retry hint instead of an empty score
- Retry no longer wipes the result panel — instead it switches into a "Last attempt" reference mode (dimmed at 0.7 opacity, banner label) and re-enables recording. The next recording overwrites and returns the panel to normal styling
- Card transitions and Exit/Next-Word continue to clear all state (last-attempt mode is per-card)

### Changed
- `ReadiiSpeech` public API: added `tokenize`, `wordDiff`, `computeScore` so practice mode can compute LCS-aligned diffs without duplicating the engine logic
- Practice result layout restructured: removed the old `.wbp-score-row` grid in favour of `.wbp-attempt-block` cards (score + tier feedback + transcript + diff)
- Mobile: attempt-block stacks score below kind label; diff scales down to 11px

---

## [2.0.0] — 2026-04-29

### Added
- feat: Word Bank 2.0 — card practice mode with AI scoring, Review queue, session summary
- New table `review_queue` (per-user spaced-repetition queue, RLS-scoped) with auto-add on score <50 and auto-graduate on best ≥80
- New `word_bank.tags TEXT[]` column (reserved for later category/source tagging)
- New left-sidebar tab **Review** — clickable, switches to a new `#view-review` showing the current user's review queue with metadata (added when, current best score) and a "Practice All" CTA
- **Word Bank hub** (`#wb-home`): two entry cards — "Practice" (random with review-priority) and "Browse" (existing 291-card grid). Footer line shows live counts of Favorites and Review queue
- **Practice mode** (`#wb-practice`): single card display with word, IPA, meaning_zh, italic example sentence, and 🔊 Hear-Word / 🔊 Hear-Sentence buttons. Two record buttons (🎤 Record Word / 🎤 Record Sentence) reuse the v1.4.4 Web Speech engine via `ReadiiSpeech.attach()`. Each scored attempt logs to `pronunciation_attempts` with `source='word_bank'`
- Score tier feedback (≥80 / ≥50 / <50) with bilingual messages and emoji tone
- Auto-add to Review when word score <50; manual "Add to Review" button always available
- Score graduation: when `best_score_since_added` reaches 80, the row is deleted from `review_queue` (proxy: rendered as "mastered" count on the Review page)
- "Save to Favorites" inline in practice flow (re-uses `user_word_favorites` from v1.9.0)
- 20-card session by default (5 from review queue + 15 random in 'random' mode; full queue in 'review' mode); session-complete summary with avg word score, avg sentence score, count added to review
- Single-word practice path: ▶ Go on a Review row launches a 1-card practice for just that word
- TTS-vs-recording mutex: clicking a 🔊 button stops any active mic recording; clicking a 🎤 button stops any playing TTS

### Changed
- Browse mode (291-card grid) is now a sub-view inside Word Bank, accessed via the hub's "Browse All →" card. All v1.9.0 features (filters, search, favorites, audio) intact
- `ReadiiSpeech` public API extended with `stop()` and `isActive()` for the mutex
- `showAppView()` dispatch table extended with `review`; breadcrumb updates per active view

### Notes
- Frontend-only on the website side; off-repo migration `migration-review-queue.sql` (DROP-then-CREATE policy idiom to avoid the 42710 error pattern)
- Major version bump (1.x → 2.0.0) per the user's "产品闭环完整" call: Reading + Voice Coach + Progress + Word Bank (browse + practice) + Review + Settings is the complete v1 product loop

---

## [1.9.0] — 2026-04-29

### Added
- feat: Word Bank — 291 British English pronunciation words with TTS audio, search, filters, and favorites
- New left-sidebar tab "Word Bank" — clickable, switches the main pane to a new `#view-word-bank`
- New tables: `word_bank` (curated list, public-readable) and `user_word_favorites` (user-scoped via RLS)
- 291 words seeded from `words.json` across the 5 Voice Coach modules: Broad A (60), Non-rhotic R (59), Short O (61), TH voiced (53), Yod (58)
- Per-word TTS audio: word.mp3 + sentence.mp3, OpenAI `tts-1-hd` with `fable` voice (British accent), uploaded to `readii-content/word-audio/{word_id}/{word|sentence}.mp3`
- 7 filter tabs (All / Broad A / Non-rhotic R / TH / Yod / Short O / ★ Favorites) — sticky on desktop scroll
- Live search filter — matches word, IPA, Chinese meaning, or example sentence (case-insensitive, debounced 80ms)
- Word card layout: word (serif), IPA (mono), Chinese meaning, italic example sentence, two play buttons (🔊 Word / 🔊 Sentence) and ⭐ favourite toggle
- Single-audio playback: clicking a play button stops any currently-playing clip across all cards; button enters a "Playing…" state with `--gold` highlight; resets on `ended` / `error`
- Favorites: persists per user via `user_word_favorites` (RLS); ⭐ becomes filled and gold once saved; if filter='Favorites' and the row is unfavourited, it disappears from view immediately
- Empty states: "Tap ★ on any word card to save it here" (Favorites empty) / "No words match …" (search empty)
- Audio buttons gracefully disabled (with tooltip "Audio not ready yet") until the corresponding storage URL lands in DB

### Changed
- `showAppView()` dispatch table extended with `word-bank` view + breadcrumb label
- Sidebar `Word Bank` item moved from no-op to clickable nav target
- All copy bilingual via `data-en` / `data-zh`

### Notes
- Frontend-only on the website side; word seeding and TTS generation done by off-repo scripts (`seed-words.js`, `generate-tts.js`)
- Migration SQL file: `C:\\Users\\sergi\\readii-transcribe\\migration-word-bank.sql`
- TTS run cost ~$0.50–0.90 (291 × 2 = 582 clips, ~16–20k characters, `tts-1-hd` @ $30/1M chars)
- Audio is private (signed URL on request, 1-hour expiry, `cacheControl: max-age=31536000`); same flow as Reading audio

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
