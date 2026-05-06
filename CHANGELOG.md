# Changelog — Readii Limited Website

All notable changes to this project will be documented here.
Format: [Version] — YYYY-MM-DD

---

## [2.7.2] — 2026-05-06

### Fixed (mobile foundation)
- fix: **Site is now usable on phones**. v1 was always desktop-first; per-screen `@media` blocks (640/600/900) had been added piecemeal as individual app views were built (Word Bank, UK Culture, Settings, My Progress, etc.), but the **foundation** — landing nav, hero, app shell sidebar, auth modal — had no mobile rules. On a typical phone (≤414px wide), the hero's `grid-template-columns: 1fr 1fr` left ~125px per column (unusable), the nav had `padding:0 56px` plus 4 nav-links + lang toggle + 2 CTAs (overflowed), and the app shell's 236px-wide fixed sidebar left ~120px for main content
- One new `@media (max-width: 768px)` block added at the end of the inline CSS, ~70 lines:
  - **Nav**: `padding:0 16px`, hide `.nav-links` (4 secondary links — accessible via scroll), tighten lang toggle + Sign in + Try Platform buttons
  - **Hero**: collapses to single column, `padding:88px 20px 48px`, hides the giant decorative gradient circle (`.hero::before`), `h1` font-size scales via `clamp(32px,8vw,48px)`
  - **App shell sidebar (`.asb`) becomes a drawer**: `position:fixed; transform:translateX(-100%)` by default; new body class `sb-open` slides it in via `transform:translateX(0)` with a `::after` pseudo-element backdrop
  - New hamburger button `.sb-toggle` inside `#view-app`. Hidden on desktop, shown only when `body.app` AND viewport ≤768px. Click toggles `body.sb-open`
  - Click-outside-to-close + auto-close on `.ni` nav-item click via single delegated `document.addEventListener('click', ...)` handler. `closeApp` and `openPersonalLibrary` clear `sb-open` defensively
  - **Auth modal** (created dynamically by `auth.js` with inline `width:400px; padding:40px`): override via global stylesheet `#auth-modal>div{padding:24px!important; width:auto!important; max-width:92vw!important}` — only fires at ≤768px so desktop is untouched
  - **Generic section padding catch-all**: `.sd, .platform-primary, .platform-secondary, .feat-grid, .pricing-grid, section[class*="-section"]` get `padding-left/right:20px` on mobile
  - `body{overflow-x:hidden}` belt-and-braces against any rogue overflow

### Notes
- Existing 12 narrower-breakpoint blocks (640/600/900) are unchanged — they cascade naturally on top of these 768px rules. App-internal screens (Word Bank, UK Culture, etc.) keep their previous mobile tuning
- This is the **minimum viable mobile foundation**, not a comprehensive mobile-first rebuild. A full mobile pass on the v2 onboarding wizard / `/today` / `/library` / `/coread` UIs will happen as those views are built (Phase B onwards), where mobile-first is cheaper than retrofitting
- New baseline archive: `archive/index-v2.7.1.html`

---

## [2.7.1] — 2026-05-06

### Changed (model pivot — v1 per-book → v2 subscription)
- **Personal Library is pivoting from per-book pricing to a £15/month subscription** with daily 07:30 task delivery, attendance rewards, freeze days, and co-read groups. See `spec-personal-library-v2-subscription.md`. v1 spec is retired (where it contradicts v2, v2 wins). v1's non-pricing engineering (PDF parse, worker architecture, Azure TTS integration plan, OpenAI prompts, pronunciation scoring) carries over as the v2 implementation foundation
- **Upload UI replaced with a Coming-soon stub** — the v2.7.0 dropzone + parse + price-preview flow doesn't fit the v2 subscription model (no per-book pricing exists). Beta users (Kevin) hitting `/learn/personal-library/upload` now see "Personal Library is being rebuilt — Beta will be back online shortly". This stub stays until Phase B (Stripe trial + onboarding wizard) is ready to replace it
- **The v1 dropzone HTML/CSS/JS is preserved in archive** (`archive/index-v2.7.0.html`) and the dormant JS functions (`plHandleFile`, `plWireDropzone`, `plSetUploadState`, etc.) are kept in `index.html` for re-wiring in Phase D (v2 user-PDF upload pipeline). Net diff is HTML-only — function definitions and CSS are unchanged
- The Netlify Function `personal-library-quote.js` is kept on disk and unreachable (no UI calls it). Will be deprecated/replaced when Phase D's worker pipeline lands
- New baseline archive: `archive/index-v2.7.0.html`

### Notes
- Stub ships **before** Phase A schema migration so the upload UI can't try to insert into `user_books` columns that Phase A is about to drop (voucher_id, base_price_pence, tier, etc.). If Kevin uploads to the v1 endpoint after Phase A is applied, the function will 500 — but no UI calls it, so that's hypothetical
- VERSION 2.7.0 → 2.7.1 (PATCH — feature surface gated/regressed, no new feature). Phase A migration will be MAJOR (3.0.0 — structural overhaul per README versioning rules)

---

## [2.7.0] — 2026-05-05

### Added (Personal Library — Phase 2b: PDF upload + parse pipeline)

This is the **first user-visible feature surface** for Personal Library beta users. Allowlisted users (currently only Kevin) can drop a PDF, see it parsed, and view the price preview. Non-allowlisted users still silently redirect to `/` and see nothing.

- **Frontend** — replaced `data-screen="upload"` placeholder stub with a real dropzone in `index.html`. State machine driven by `data-state` on `.pl-up`: `idle` → `uploading` → `analysing` → `success` / `error`. Five states, one `data-state` attribute, simple. Drag-and-drop + click-to-browse. Progress bar (faked, capped at 85% until upload actually resolves — Supabase JS v2 doesn't expose real progress events). Error states map server `code` strings to localised EN/中文 copy via `PL_ERROR_COPY` table. After success: title, author (italic), page count, word count, estimated audio duration, and "Starting at £X" using the Sonia (cheapest) tier. "Upload another" button resets state without leaving the route
- **Backend** — new `netlify/functions/personal-library-quote.js`:
  - JWT verification via `supabaseAdmin.auth.getUser(jwt)`
  - **Server-side allowlist guard**: rejects with 403 `NOT_AUTHORIZED` if `user_profiles.pl_beta_access` is not true. This is the non-bypassable layer — frontend gate is just UX
  - Downloads PDF from `user-pdfs/{user_id}/{book_id}/source.pdf` via service role
  - Parses with `pdf-parse` (using inner module require to dodge the v1.1.1 test-PDF debug bug)
  - Language detection via `franc` (lazy dynamic import — franc v6+ is ESM-only, so we cache the import promise at module level)
  - Validates: size ≤ 50 MB, pages ≤ 800, avg chars/page ≥ 50 (scan detection), language is `eng` or `und`
  - Computes `estimated_audio_seconds` from `READING_WPM=130`, then tier (`short`/`medium`/`long`/`xlarge`) and per-voice pricing for all 4 voices (Sonia/Ryan + HD variants @ +50%)
  - Inserts `user_books` row with `status='pending_payment'`. Schema requires `voice_id` and `daily_minutes` NOT NULL but those aren't chosen until checkout — uses `sonia` + `15` as placeholders, overwritten in Phase 3
  - Returns the full §7.1 spec response shape, including `pricing_preview.by_voice` for all 4 voices (frontend uses `sonia` for now, voice-specific prices ready for Phase 2c without API change)
- **Function deps** — `netlify/functions/package.json` now includes `pdf-parse` ^1.1.1 + `franc` ^6.2.0
- **Routing hook** — `plShowScreen('upload')` now also lazy-wires the dropzone (idempotent, marked via `data-wired="1"`) and resets state to `idle` so re-entry doesn't show stale results

### ⚠️ Operator action required (Netlify env vars)

Two new env vars must be set on Netlify Dashboard → Site settings → Environment variables:
- `SUPABASE_URL` = the project URL (matches `assets/js/supabase-client.js`)
- `SUPABASE_SERVICE_KEY` = service-role key (Supabase Dashboard → Settings → API → `service_role` secret)

If these aren't set, the function returns 500 `CONFIG_MISSING` and the upload UI shows "Server isn't fully configured yet."

Optional tuning vars (defaults are fine):
- `READING_WPM` (default 130) — words per minute for ESL audio estimation
- `MAX_PDF_BYTES` (default 52428800 = 50 MB)
- `MAX_PDF_PAGES` (default 800)

### Notes
- Error response shape consistent with spec §7: `{error: {code, message}}`. Codes: `PDF_TOO_LARGE`, `PDF_TOO_MANY_PAGES`, `PDF_SCANNED`, `PDF_NOT_ENGLISH`, `PDF_PARSE_FAILED`, `PDF_NOT_FOUND`, `INVALID_BODY`, `INVALID_BOOK_ID`, `UNAUTHORIZED`, `NOT_AUTHORIZED`, `CONFIG_MISSING`, `DB_INSERT_FAILED`, `METHOD_NOT_ALLOWED`
- 24h cleanup of unpaid PDFs (spec §10) still deferred to Phase 4 worker. Orphans accumulate until then. Acceptable for beta of 1
- `available_voices[].preview_url` returned as `null` for now — preview MP3s are pre-generated in Phase 2c
- New baseline archive: `archive/index-v2.6.4.html`

---

## [2.6.4] — 2026-05-05

### Fixed
- fix: **"Loading today's book…" stuck forever after v2.6.3 deploy.** Root cause: same class of bug as v2.6.3 (relative paths breaking at deep routes), but a different SYNTACTIC form I missed. v2.6.3 fixed 4 `<script src="assets/...">` (classic script tags). I missed line 5325 — a `<script type="module">` with `import { ... } from './assets/js/library.js'` (ES module import, relative path). At deep routes like `/learn/personal-library/...` this resolved to `/learn/personal-library/assets/js/library.js`, didn't exist, Netlify catch-all served `index.html` with `text/html`, ES module loader refused to execute → `library.js` never loaded → `loadLibrary()` and `checkAccess()` never callable from inline app code → "Loading today's book…" string sat there because the function that replaces it never ran
- 1-line fix: changed `from './assets/js/library.js'` to `from '/assets/js/library.js'` (absolute path)

### Notes
- This was actually the user's ORIGINAL diagnosis when first reporting the MIME error: "module script ... text/html". I read it as a generic relative-path issue and only grep'd for `<script src=`, missing the `import ... from` form. **Lesson:** when fixing a regression, search ALL syntactic forms of the same class of issue — script src, link href, img src, ES module import, dynamic import(), CSS @import, fetch() with relative paths
- Verified after this fix: `grep -nE "import .* from ['\"]\\./` returns no matches in `index.html`
- `library.js` itself has zero internal imports (checked) — it's a leaf module, no chain effect
- Probably also explains why Sign In appeared broken earlier: `library.js`'s `checkAccess()` is called from the inline module's `initApp()`, which sets up Sign-In click handlers. Module fails to load → Sign-In handlers never wired → button looked broken

### Operator action
- Hard refresh after Netlify deploys this commit. Today's book card and Browse-all-books should both come back

---

## [2.6.3] — 2026-05-05

### Fixed
- fix: **Relative `<script src>` paths broke at deep routes like `/learn/personal-library`, causing MIME error `Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`.** Root cause: lines 5320-5323 used `src="assets/js/..."` (relative). At `/app` and `/` the relative resolution worked because both are single-segment paths and the directory portion is `/`. At `/learn/personal-library/upload` the directory portion is `/learn/personal-library/`, so `assets/js/auth.js` resolved to `/learn/personal-library/assets/js/auth.js`. That file doesn't exist → Netlify SPA catch-all returned `index.html` with `text/html` → browser refused to execute as JavaScript
- 4 lines changed: `assets/js/{supabase-client,stripe-config,auth,checkout}.js` → `/assets/js/...` (absolute paths). Now resolves correctly at any route depth

### Notes
- **`netlify.toml` was NOT modified.** The Personal Library beta tester (Xiaoyu) initially diagnosed the issue as "SPA fallback rewriting .js requests to /index.html". That observation is correct as a *symptom* — the catch-all rule does serve `index.html` for unknown paths, including the wrong-path .js requests. But the *cause* is the relative path resolution at the source (HTML), not the Netlify rule. Adding pre-catch-all redirect rules for static-asset extensions would fix the symptom but leave the brittle relative paths in place; future deep routes would just rediscover the bug
- Articles HTML files in `articles/*.html` were checked and contain no relative `assets/...` references, so they're unaffected
- Existing `<script src="https://cdn.jsdelivr.net/...">` (line 5319) is absolute — was already fine
- New baseline archive: `archive/index-v2.6.2.html`

---

## [2.6.2] — 2026-05-05

### Changed (security hardening)
- fix: **Personal Library gate now silently redirects non-allowlist visitors to `/`**, instead of showing a "Personal Library — Coming soon" branded page. The previous "locked" screen leaked the feature name + existence to anyone who guessed the URL. Now a non-allowlist user typing `/learn/personal-library/*` lands on the homepage with the URL replaced to `/`, indistinguishable from any other unknown path
- The `data-screen="locked"` HTML block has been removed from `index.html`. `.pl-soon` and `.pl-soon-tag` CSS rules retained for now (low cost) but unused
- `openPersonalLibrary()` reorganised so the gate runs **before** any DOM mutation. No `body.pl-active` class, no PL view rendering, no URL push for non-allowlisted users — they never see anything PL-branded for any frame
- `popstate` handler hardened symmetrically: same-shell sub-route changes also re-check the gate and silent-redirect on failure (covers the "user logged out in another tab then hit back" edge case)

### Added
- `_plBetaCache` — session-level memoization of the beta access result, so rapid back/forward navigation doesn't hammer Supabase. Cleared on auth state change via `assets/js/auth.js`'s existing `authOnStateChange` callback (added one line: `plInvalidateBetaCache()` after `updateAuthUI()`). Transient errors are NOT cached — they fall through and re-check on next call

### Notes
- This is a **frontend-only** hardening. Phase 2b will add server-side allowlist checks on every Netlify Function — front-end gate is necessary but not sufficient (anyone with DevTools can flip a class). Backend guards are non-bypassable
- Allowlist mechanism (boolean `user_profiles.pl_beta_access`) unchanged — see WORKLOG Session 38 / migration-personal-library.sql §9. Still only `Kevin_SU2022@163.COM` enabled
- HTML for the PL views is still present in `index.html` source for any visitor (static SPA — can't conditionally render server-side without a build step). What's hidden is **behaviour**: the views never become visible to non-allowlist users. If view-source obfuscation becomes a hard requirement later, we'd need a build pipeline to strip PL blocks for the public bundle. Out of scope for now
- New baseline archive: `archive/index-v2.6.1.html`

---

## [2.6.1] — 2026-05-05

### Added
- feat: **Personal Library — Phase 2a (frontend skeleton + beta gate).** Routes `/learn/personal-library`, `/learn/personal-library/upload`, `/learn/personal-library/vouchers`, `/learn/personal-library/{bookId}`, and `/learn/personal-library/{bookId}/day/{n}` are now reachable via direct URL only. **No public navigation entry — feature is invisible to non-beta users.** Access gated on `user_profiles.pl_beta_access`; non-beta users land on a "Coming soon" placeholder regardless of which sub-route they hit
- New views in `index.html` under `#view-pl`: `locked` (Coming soon), `list` (empty state with Upload CTA), `upload`/`vouchers`/`book`/`day` (placeholder stubs — real UI ships in 2b–2d / Phase 5–6). All copy bilingual EN/中文 via existing `data-en`/`data-zh` pattern
- Routing helpers: `openPersonalLibrary(screen, params)`, `closePersonalLibrary()`, `plParseRoute(pathname)`, `plPathFor(screen, params)`, `plShowScreen(name)`, `checkPLBetaAccess()`. Uses `history.pushState`/`popstate` consistent with existing `openApp`/`closeApp` pattern (v2.5.1)
- Browser Back/Forward correctly synced — popstate handler distinguishes `/app` ↔ `/learn/personal-library/*` ↔ `/` transitions and re-renders the right view + body class
- Direct URL deep-linking: typing `/learn/personal-library/upload` in the address bar (or refreshing while on a PL route) lands the user on the correct sub-screen with the beta gate evaluated server-truth-first via Supabase
- New baseline archive: `archive/index-v2.5.2.html` (this is the first time the archive folder gets used; v2.5.2 was the last release that actually mutated `index.html` before this session, so it's the correct snapshot)

### Notes
- This release ships **no user-visible feature surface to non-beta users** (intentional — bumped as PATCH not MINOR for that reason). Only `Kevin_SU2022@163.COM` has `pl_beta_access=true` per the v2.6.0 migration. Other users typing the URL see "Coming soon" with no leakage of feature details
- Beta-access lookup is best-effort: if Supabase is unreachable, the column doesn't exist (migration not applied), or the user has no `user_profiles` row yet, `checkPLBetaAccess()` returns `false` → user sees the locked screen. Acceptable degradation for the gate
- index.html grew from 5947 to 6134 lines (+187). Single-page architecture preserved; if file size becomes a maintenance concern in later phases, splitting can happen at v3.0.0
- Phase 2b will replace the upload stub with the real PdfDropzone + Netlify Function `personal-library-quote`. Phase 2c will replace it with the full quote panel (voice picker + minutes slider + price). Pricing/checkout logic does not yet exist on this branch

---

## [2.6.0] — 2026-05-05

### Added
- feat: **Personal Library — Phase 1 (schema + storage foundations).** New product line letting users upload any English PDF and get a personalised audiobook + daily reading plan + pronunciation practice. Per-book pricing (£8/£18/£30/£45 tiers). Per spec `spec-personal-library.md`. **No frontend entry point shipped — all routes gated on a beta flag, only Kevin's account enabled for now.**
- New migration `database/migration-personal-library.sql` — single file containing 4 new tables (`user_books`, `user_book_chunks`, `user_book_vouchers`, `book_processing_jobs`), RLS policies, 3 private storage buckets (`user-pdfs`, `user-book-audio`, `user-book-recordings`) with per-user path-based RLS, and verification queries
- `user_profiles.pl_beta_access` (BOOLEAN, default false) — gate flag for Personal Library access during internal testing. Migration grants `pl_beta_access=true` to `Kevin_SU2022@163.COM` (case-insensitive email match)
- `database/README.md` updated with the 4 new Personal Library tables

### Changed
- `pronunciation_attempts` extended with two new columns: `source_id` (UUID, points to `user_book_chunks.id` for Personal Library entries) and `source_metadata` (JSONB, holds `{day_number, sentence_index, sentence_text}`). New composite index `(user_id, source, source_id)`
- **Deviation from spec §3.2:** spec proposed adding a new `source_type` column with a CHECK constraint covering all 4 sources. Existing code already uses a `source` column with the same semantics in 6+ read/write sites (`index.html`, `seed-reviewer-account.js`). Adding `source_type` would either fork data (some rows use `source`, new ones use `source_type`) or require a high-risk rewrite of existing call sites. Decision: reuse `source`, add `'personal_library'` as a new value (no CHECK constraint added to avoid back-fill validation against ~200 historical reviewer rows). My Progress dashboard picks up Personal Library scores with zero code changes — the spec's stated goal is preserved

### Notes
- Phase 1 is database/storage only. No backend endpoints, no frontend, no worker. Stripe / Azure / Resend integration starts at Phase 3 / 4
- Migration is idempotent — safe to re-run. Uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, `ON CONFLICT DO NOTHING` for storage buckets, and a `pg_constraint` guard for the circular FK between `user_books` ↔ `user_book_vouchers`
- Operator must run the migration manually in Supabase SQL Editor (existing convention) — see WORKLOG Session 38 for the verification checklist
- 24h cleanup cron for unpaid PDFs (spec §13 Phase 1 step 4) deferred to Phase 4 worker — the worker's poll loop is a natural place to do this and avoids needing `pg_cron` extension just for Phase 1

---

## [2.5.4] — 2026-05-04

### Fixed
- chore: **Reviewer demo account upgraded to active subscription** so books unlock for direct reading. The library access gate in `assets/js/library.js:checkAccess()` reads `user_profiles.subscription_status === 'active'`; the prior seed value of `'free'` was hiding all books behind a 🔒 paywall on the reviewer experience
- Set `subscription_start = today`, `subscription_end = today + 365 days` for a 1-year review window

### Added
- New script `scripts/upgrade-reviewer-subscription.js` — surgical patch that flips just the subscription fields on the existing reviewer auth user without touching password or seeded activity data. Use this for spot-fixes between full re-runs of the seeder
- Main `scripts/seed-reviewer-account.js` updated: future re-runs default to `subscription_status='active'` with the same 1-year window so the reviewer-as-paying-user state survives full re-seeds

### Notes
- Existing password from the v2.5.3 run still works — the surgical patch did not rotate it
- Reviewer can now click any book in the Library, see the audio player, and access the full reading flow
- No changes to website code, auth, or RLS policies — pure data flip

---

## [2.5.3] — 2026-05-04

### Added
- chore: **Provisioned reviewer demo account on production with seeded 30-day activity data for platform review purposes.** Single account (`reviewer@readii.co.uk`) at `https://readii.co.uk` for UK endorsing-body reviewers. Indistinguishable from a real user at the application layer — no demo flags, no banners
- New script `scripts/seed-reviewer-account.js`: idempotent provisioner that creates or refreshes the reviewer auth user, wipes prior seeded activity, and re-inserts realistic data across `user_profiles`, `streaks`, `user_daily_book`, `progress`, `pronunciation_attempts`, `user_word_favorites`, `review_queue`, and `uk_culture_progress`
- Script supports `--dry-run` to print the plan without writes; reads `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` from gitignored `.env`. Never prints credentials except as final stdout output for the operator to copy

### Seeded data shape (per brief)
- `pronunciation_attempts`: ~175 voice_coach + reading + 7 word_bank + 16 uk_culture mirror = 198 total, distributed across 30 days with cluster-into-sessions timing
- `voice_coach` per-module split: Broad A 50 (trend-up, ≥3 perfect-100s, best 100), Non-rhotic R 35 (best 95), TH voiced 30 (best 90), Yod 25 (best 85), Short O 15 (best 80)
- `progress`: 20 lessons (14 in last 7 days, 6 earlier 8-25 days ago) — fetched from a broader lesson pool than the 6 daily-book picks so the "Lessons this week" stat hits 14
- `user_daily_book`: 6 entries — today in-progress + 4 consecutive completed days + 1 break + 1 earlier (current_streak=4, longest=10 in `streaks`)
- `user_profiles.reading_level`: 2; `books_read_count`: 6
- 6 books picked from 3 series (Heinemann GK, G1, G2) across reading levels 1/2/3 — covers brief's "≥2 series, ≥2 levels" requirement
- `user_word_favorites`: 6 mastered words (random pick from `word_bank`)
- `review_queue`: 3 words with `best_score_since_added` 35-55, added 2-14 days ago
- `uk_culture_progress`: 16 entries — meeting L1 ×1 (score 100), email L1 ×7 (avg ~98), setup L3 ×8 (scores 86-100). Mirrored to `pronunciation_attempts` with `source='uk_culture'` per the v2.2.0 dual-write pattern

### Notes
- Idempotent: the script lists users by email, updates the password if found, wipes all prior seeded rows for that user_id, re-inserts. Auth user_id stable across re-runs so external references remain valid
- Falls back to `demo.reviewer@readii.co.uk` if the primary email is unavailable
- The script file is committed (read-only logic, no secrets); credentials are NOT committed (printed once to stdout for the operator)
- Random 12-char password regenerated on every run (mixed upper/lower/digit, excluding visually ambiguous chars `I/l/1/O/0`); each run prints the new credential set so the operator can update the documentation pack
- No changes to website code — pure database provisioning
- See WORKLOG Session 36 for the full design notes and verification checklist

---

## [2.5.2] — 2026-05-04

### Fixed
- chore: **Corrected reader narration teacher attribution from placeholder identity (Emma / Southern England) to actual personnel (Matt / London).** These strings appear in formal documentation submitted to a UK endorsing body, so on-screen attribution must reflect real personnel
- 3 sites updated in `index.html`:
  - Hero mock player (line 851): `Emma · Unit 14 · 4:22` → `Matt · Unit 14 · 4:22` (EN + ZH)
  - Reading panel header (line 1070): `Read by Emma · Native British teacher` → `Read by Matt · Native British teacher` (EN + ZH `Emma 朗读` → `Matt 朗读`)
  - AI Pronunciation panel teacher chip (line 1087): avatar initial `E` → `M`; `Emma · British English teacher` → `Matt · British English teacher` (EN + ZH); `Native speaker · Southern England` → `Native speaker · London` (EN + ZH `英格兰南部` → `伦敦`)
- Avatar is the existing initial-badge style (`.aptav` — forest gradient circle) — only the letter changed from "E" to "M". No image asset added/removed; no female avatar with a male name

### Notes
- Larry (commentary teacher) is not referenced in `index.html` — no risk of accidental edit
- Audio files unchanged (presentation-layer only, per brief)
- ZH equivalents present for all three sites; updated in lockstep with EN
- Three remaining "Emma" matches are flagged as out-of-scope per brief (clearly unrelated to teacher identity):
  - `WORKLOG.md:981` — historical audit log line referencing a real test user's email `huangemma60@foxmail.com`. Rewriting historical worklog entries is out of scope
  - `tools/seed-test-users.js:41` — `'Emma'` appears in a list of common first names used to randomly seed fake test accounts (alongside `'Lily'`, `'Lucy'`, `'Ethan'`, etc.). Not teacher attribution
  - `tools/seeded-test-users.json:297,299` — JSON output of the above seeding script (real seeded user `Emma Huang` with `huangemma60@foxmail.com`). Not teacher attribution
- "Southern England" returns zero matches anywhere in the codebase ✓

---

## [2.5.1] — 2026-05-04

### Fixed
- fix: **Browser Back button now returns to landing instead of leaving the site.** `openApp()` previously toggled a CSS class only — no URL change, no history entry — so the browser had nothing to go back to and Back navigated away from readii.co.uk entirely
- `openApp()` now `history.pushState({readiiApp:true}, '', '/app')` on entry (skipped if already on `/app`, so refreshes don't stack duplicates)
- `closeApp()` now calls `history.back()` when our pushState put us on `/app`; falls back to `history.replaceState` to `/` if the user landed on `/app` directly (no in-site entry to go back to)
- Added `popstate` listener so browser Back/Forward syncs the app-shell class with the URL (entering /app re-enters app shell; leaving /app drops it)
- Sidebar **Readii logo** is now clickable (was a non-interactive `<span>`). `role="link" tabindex="0"`, Enter/Space activates, Click → `closeApp()`. Hover bg + focus-visible gold ring for a11y

### Added
- Direct-load support for `/app`: the existing Netlify SPA rewrite (`/* → /index.html`) already serves index.html for `/app`. New init-time check at the bottom of the inline script: if `pathname === '/app'`, call `window.openApp()` (the wrapped async version). The inner `openApp` guards the pushState so this initial enter doesn't re-push the same URL

### Notes
- No backend / auth / routing changes — pure client-side history wiring
- Hash anchors on the landing (`#platform`, `#reading`, `#about`, `#pricing`) are unaffected — they share the URL but use the hash channel
- In-app navigation (sidebar tabs: Library, Voice Coach, Word Bank, etc.) still uses `showAppView()` and does NOT change the URL — out of scope this fix. Could be a future enhancement (e.g. `/app/voice-coach`) but adds complexity without solving the reported bug

---

## [2.5.0] — 2026-05-04

### Changed
- chore: **Visa-documentation alignment** — repositioned the public site so the EdTech platform is the visible core, with cross-border services subordinate. Driven by the Innovator Founder visa extension prep: the documented business model treats advisory/cross-border work as value-added services for existing platform members, not a co-equal third pillar
- Hero copy: "helping children master English and entrepreneurs build confidently in the UK" → "helping non-native speakers master British English with confidence, from children to professionals" (EN + ZH)
- Stats card: `100+ / Clients served` → `150+ / Children coached` (EN + ZH)
- Meta description: removed "cross-border business support" tail; now leads with AI voice + 1,000+ audio lessons + non-native speaker focus

### Added
- New `#platform` section structure: primary block (white card, prominent) + 5 module chips linking into AI Voice Coach + subordinate "Beyond the platform" block (muted `--cream2` bg, smaller h3, italic footnote "Available to existing platform members.")
- 5 chips reuse the canonical Voice Coach module copy (Broad A / Non-rhotic R / TH voiced / Yod retention / Short O). Each chip onclick → `openVoiceCoachFromLanding(moduleId)` which opens the app shell, switches to `voice-coach` view, and drills into that module
- New CSS: `.platform-primary`, `.platform-body`, `.platform-modules`, `.platform-chip`, `.platform-secondary`, `.platform-secondary-title`, `.platform-secondary-body`, `.platform-secondary-note` + mobile @media rule

### Removed
- Old `.fgrid` 3-column "Three layers" structure with `01 AI Voice Engine`, `02 English Learning Platform`, `03 Cross-border Business Programme` cards
- Pricing tier 3 (Business Programme — Custom / project-based) entirely. `Book a call` mailto CTA removed with it
- Footer "Business Programme" link (`#pricing` → orphan after the tier removal)
- Forbidden phrases removed from the page: "Three layers", "UK market entry support", "business establishment services", "UK company formation", "Market research & business plan", "Partner & supplier introductions", "Cross-border communication training", "Cross-border Business Programme"

### Changed (layout)
- `.pgrid` from `repeat(3,1fr)` to `repeat(2,minmax(0,360px))` with `justify-content:center` + `max-width:780px` + `margin:0 auto` so two tiers render balanced on desktop
- Mobile: `.pgrid` collapses to single column (max-width 420px) at ≤640px
- `.platform-modules` uses `repeat(auto-fit,minmax(220px,1fr))` so 5 chips wrap cleanly across breakpoints

### Notes
- Keep "Most popular" badge on Learner Pro — still works visually with two tiers (Children entry vs Pro premium)
- `Most popular` ZH text and CTA copy unchanged
- Footer description still contains "entrepreneurs" — out of scope per brief (brief restricted entrepreneurs-removal to the hero)
- `articles/index.html` and `privacy-policy.html` not touched: they don't contain any of the verbatim deleted strings, and brief flagged "SEO meta tag rewrites beyond removed strings" as out of scope
- ZH translations applied throughout (homepage uses inline `data-en`/`data-zh` spans, so ZH structure mirrors EN — single edit pass for both)

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

## [2.4.2] — 2026-04-30

### Fixed
- fix: default landing view changed from Reading Library to My Progress
- `window.openApp` override now calls `showAppView('progress')` after the existing setup, so the user lands on Progress on every app entry
- `showAppView` fallback default switched from `'library'` to `'progress'` (covers the unknown-view-name edge case)
- Sidebar `act` highlight initial-state class moved from `ni-library` to `ni-progress` so the nav matches the displayed view on first paint (no library-then-progress flash)

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
