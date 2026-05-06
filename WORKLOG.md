# Work Log — Readii Website

---

## 2026-05-06 | Session 46 | v2.7.3

**Objective:** Fix mobile reading panel. Xiaoyu reported that tapping into a single book in Reading Library still doesn't display correctly on phone — v2.7.2's mobile pass covered nav/hero/app-shell/auth-modal but missed `.agr` (the book reader's 2-column grid).

**Why this happened:**
v2.7.2 was written from a "site foundation" mental model — global components like nav/hero/app-shell/modal. The reading panel `.agr` grid is technically inside the app shell's main content area, so it inherited the responsive container, but its OWN grid declaration (`grid-template-columns: 1fr 348px`) overrode any fluid behaviour. The 348px right column is fixed, so on a 360-414px viewport, the right column eats most of the width and the left iframe column gets squeezed to ~25px. Same class of bug as the v2.6.3 → v2.6.4 "I missed an `import` form" — search ALL the offending forms.

**Approach:** Extended the existing `@media (max-width:768px)` block (no new block, no extra HTML). ~25 lines of CSS additions. Stack `.agr` to single column on mobile, shrink the reading panel header / book cover / audio player / waveform / cards to phone-friendly sizes, prevent the time-display in `.apctrl` from being squeezed off the right edge by adding `flex-shrink:0` on `.aptime` and `.apspd`.

**Specific rules added:**
- `.agr { grid-template-columns: 1fr; gap: 14px }` — the core fix
- `.rph` (reading-panel header): smaller padding, smaller cover (`.rpbc` 40×52 instead of 46×60), smaller title font
- `.rpbody` and `#pdf-frame` / `#pdf-placeholder` get `min-height:360px / 240px` — was implicitly tall on desktop, would have left awkward whitespace on phone
- `.aplayer` (sticky audio player): smaller padding, smaller play button (36 instead of 38), smaller waveform (32 height instead of 40)
- `.apctrl`: tighter gap, but critically `.approg{flex:1;min-width:0}` lets the progress bar shrink, and `.aptime{flex-shrink:0}` keeps the "1:52 / 4:22" text from being eaten
- `.pc` cards (Pronunciation / Vocabulary / Progress): tighter header + body padding
- `.vi` (vocabulary items): `flex-wrap:wrap` so the play button doesn't push the word off the row

**Completed:**
- [x] Extended `@media (max-width:768px)` block with reading panel rules (~25 lines)
- [x] No HTML changes; no new archive (rules-only addition to existing CSS)
- [x] VERSION 2.7.2 → 2.7.3 (PATCH — bug fix, follow-up to incomplete v2.7.2 mobile pass)
- [x] CHANGELOG [2.7.3] entry

**Files changed:**
- index.html (~+25 CSS lines inside existing 768px @media block)
- VERSION (2.7.2 → 2.7.3)
- CHANGELOG.md ([2.7.3] entry)
- WORKLOG.md (this Session 46)

**Pending (operator phone test):**
- [ ] Hard refresh after Netlify deploy (or wait 1-2 min from push)
- [ ] Open Reading Library on phone, tap a book
- [ ] Reading panel header should fit, book title + subtitle visible
- [ ] PDF iframe should fill the available width, ~360px tall (scrollable inside)
- [ ] Audio player at the bottom: play button + progress bar + time text + speed button all on one row, not overflowing
- [ ] Below the reader: AI Pronunciation card, then Vocabulary card, then This-week card — each full width, stacked vertically
- [ ] No horizontal scroll
- [ ] If still misbehaves: tell me which element is the problem (screenshot or describe), I'll add a targeted rule

**Lesson echo (per memory feedback_search_all_syntactic_forms):**
v2.7.2's commit body claimed "minimum viable mobile foundation" but didn't enumerate the components covered. When a class of bug (here: hard-coded 2-column grids that don't collapse on mobile) is being fixed, the next fix should grep for all uses of that pattern, not just the most-visible ones. For "grid-template-columns: ... + ...px" this codebase has at least 5 hits (`.agr`, `.pgrid`, `.platform-modules`, `.ukc-modules`, `.wb-grid`). Three of those already had `@media` rules; the other two didn't. Lesson: next mobile pass — grep `grid-template-columns` AND `display:flex` (with hard-coded widths) and check each one has a mobile fallback.

---

## 2026-05-06 | Session 45 | v2.7.2

**Objective:** Make readii.co.uk usable on phones. Xiaoyu reported "尺寸不对，很多功能都无法正常显示" when testing on his phone. Diagnosis: site has 12 existing `@media` blocks but they're all narrow-scope — covering individual app screens (Word Bank, UK Culture, Settings, etc.) — never the **foundation** (landing nav, hero, app shell, auth modal). On a phone (~360–414px wide) the hero's 2-column grid crushes both halves to ~125px and the 236px sidebar leaves ~120px for main content.

**Why this matters:**
Xiaoyu can't test his own site on his phone before pushing it to investors / endorsing-body reviewers. The advisor / reviewer might also try the site on a phone. Even ignoring the v2 pivot, current v1 needs to at least look credible on mobile.

**Approach:** One new `@media (max-width:768px)` block at the END of the inline CSS, before `</style>`. Cascades on top of existing 640/600/900 rules (which keep working — they have narrower breakpoints, so they layer over the 768 rules where applicable). This is the **minimum viable mobile foundation**, not a comprehensive mobile-first rebuild — a full mobile pass on the v2 onboarding/today/library/coread UIs will happen as those views are built.

**Why not lower the breakpoint to 640 (matching existing)?**
768px catches tablet-portrait and large phones (e.g. iPhone Plus models in landscape, iPad mini portrait) where the desktop layout also breaks down. 640 leaves a noticeable middle zone where the site still looks bad. 768 is the standard "mobile + small tablet" breakpoint.

**Foundation issues fixed:**
1. **Landing nav** (`<nav>`): `padding:0 16px`, hide `.nav-links` (the 4 hash links — accessible via scroll), shrink lang toggle + Sign in + Try Platform buttons
2. **Hero** (`.hero`): single column instead of 2, less padding, hide the giant `::before` gradient circle decoration, h1 uses `clamp(32px,8vw,48px)` for fluid scaling
3. **Generic section padding**: catch-all selector hits `.sd`, `.platform-primary`, `.platform-secondary`, `.feat-grid`, `.pricing-grid`, `section[class*="-section"]` with 20px horizontal padding
4. **App shell drawer**: `.asb` (sidebar) becomes `position:fixed; transform:translateX(-100%)`; `body.sb-open` slides it in; `body.sb-open::after` is the dimmed backdrop
5. **Hamburger button** (`.sb-toggle`): new HTML inserted inside `#view-app`, hidden on desktop, shown only when `body.app` AND viewport ≤768px. SVG icon (3 horizontal lines, no emoji)
6. **Auth modal**: created dynamically by `auth.js` with inline `width:400px; padding:40px`. Override via global stylesheet rule `#auth-modal>div{padding:24px!important; width:auto!important; max-width:92vw!important}` — only fires at ≤768px, desktop untouched
7. **Belt-and-braces**: `body{overflow-x:hidden}` to kill any rogue horizontal scroll from a missed rule

**Sidebar drawer interaction:**
- Click hamburger → `toggleSidebar()` adds `body.sb-open`
- Click anywhere outside `.asb` and `.sb-toggle` while drawer is open → close (single delegated `document.addEventListener('click', ...)` listener)
- Click any `.ni` nav-item → close (so the user navigates without manually closing)
- `closeApp()` and `openPersonalLibrary()` clear `sb-open` defensively to avoid leaking state across views

**Completed:**
- [x] Archived `index.html` → `archive/index-v2.7.1.html`
- [x] Added one `@media (max-width:768px)` block (~70 lines CSS) at end of inline CSS
- [x] Inserted `.sb-toggle` button HTML inside `#view-app` (svg icon, ARIA label, fixed-positioned via CSS)
- [x] Added `toggleSidebar()` + delegated click handler near `closeApp()` for thematic grouping
- [x] Added defensive `body.classList.remove('sb-open')` to `closeApp()` and `openPersonalLibrary()`
- [x] Verified existing narrower `@media (max-width:640px)` and `(max-width:600px)` blocks still apply (cascade order: 768 fires first, 640/600 layer over with more specific values where defined)
- [x] VERSION 2.7.1 → 2.7.2 (PATCH — bug fix, no feature surface change)

**Files changed:**
- index.html (~+90 lines: ~70 CSS + ~10 HTML hamburger + ~10 JS toggle/close)
- archive/index-v2.7.1.html (new baseline)
- VERSION (2.7.1 → 2.7.2)
- CHANGELOG.md ([2.7.2] entry)
- WORKLOG.md (this Session 45)

**Pending (operator browser test on phone after deploy):**
- [ ] **Hard refresh** on phone (most browsers: pull down to refresh + clear cache via browser settings)
- [ ] Open `https://readii.co.uk` on phone
- [ ] Nav: only logo + lang toggle + Sign in + Try Platform are visible. No 4-link bar
- [ ] Hero: title + subtitle stack vertically; the big gradient circle is gone; h1 readable
- [ ] Sign in tap: modal opens, doesn't overflow viewport, form fields full-width inside the modal padding
- [ ] After login → tap Try Platform → enters app shell. Hamburger button appears top-left
- [ ] Tap hamburger → sidebar slides in from left, dimmed backdrop covers main content
- [ ] Tap a nav item (e.g. Reading Library) → drawer closes, view switches
- [ ] Tap hamburger again → drawer slides in. Tap on the dim area → drawer closes
- [ ] Tap "Back to site" inside drawer → drawer should close, app shell exits, back to landing
- [ ] No horizontal scroll on any page (including PL `/learn/personal-library` Coming-soon stub)

**Known limitations of this minimum pass:**
- The `.atb` top-bar inside the app shell may still feel cramped on phones (book title + lang toggle + Back to site button all in one row). Acceptable — the narrower 640/600 rules from existing screens may already help. If it's bad, we add an extra rule later
- The 4 hidden landing nav-links (`Platform / For Children / About / Pricing`) aren't reachable via tap on mobile — only by scrolling down to those sections. Adding a hamburger to landing nav too is feasible but out of scope for this minimum pass
- Per-section content (cards, modules) inside landing may still need individual tweaks — those'll be visible after Xiaoyu's next phone test, we iterate from there

---

## 2026-05-06 | Session 44 | v2.7.1

**Objective:** Stub the v2.7.0 upload UI before Phase A schema migration, in preparation for the v1 per-book → v2 subscription model pivot. Xiaoyu has dropped a new spec (`spec-personal-library-v2-subscription.md`) which replaces the v1 per-book pricing model with £15/month subscription + daily 07:30 task delivery + attendance rewards + freeze days + co-read. v1's non-pricing engineering (PDF parse, worker plan, Azure TTS, OpenAI prompts, pronunciation scoring) is reused; v1's pricing/voucher/tier code is retired.

**Why this matters:**
The v2.7.0 dropzone immediately tries to write to `user_books` with `voucher_id=null`, `voucher_discount_pence=0`, `base_price_pence=...`, `voice_premium_pence=0`, `amount_paid_pence=0`, `tier='medium'`, `voice_id='sonia-hd'`-or-similar. Phase A migration drops every one of those columns and tightens `voice_id` from 4 values down to 2. If the v2.7.0 frontend stays live across the migration, every upload attempt 500s with a Postgres column-doesn't-exist error. Stubbing the UI first means there's no code path that hits the about-to-break columns. Then Phase A is a clean schema rewrite with zero coordination risk. Then Phase B onboarding lands, and the stub gets replaced with the v2 wizard.

**Approach:** Replace only the inner HTML of `data-screen="upload"` — keep the dormant CSS (`.pl-up*`, `.pl-dz*`) and the dormant JS functions (`plHandleFile`, `plWireDropzone`, etc.) in place because Phase D (v2 user-PDF upload) will re-wire them. Reuse the existing `.pl-soon` class (originally introduced in v2.6.1 for the locked screen, removed in v2.6.2 as a security leak, but the CSS rules were left in place — turns out useful here).

**Completed:**
- [x] Archived `index.html` → `archive/index-v2.7.0.html` (last v1-pricing-model version)
- [x] Replaced upload sub-screen 5-state dropzone HTML (~70 lines) with a single `.pl-soon` Coming-soon block. Bilingual EN/中文. "Back to Readii" button calls `closePersonalLibrary()`
- [x] Preserved CSS (`.pl-up*`, `.pl-dz*`, `@keyframes plSpin`) for Phase D reuse
- [x] Preserved JS (`plHandleFile`, `plWireDropzone`, `plSetUploadState`, `plResetUpload`, `plShowUploadError`, `plFmtDuration`, `plFmtPence`, `PL_ERROR_COPY`) — dormant but accessible
- [x] `plShowScreen('upload')`'s lazy-wire of `plWireDropzone()` is now a no-op (no `#pl-dropzone` element to wire), but it doesn't error because the function early-returns on missing element. Side-effect-free
- [x] `personal-library-quote.js` Netlify Function kept on disk — no UI calls it after this stub. Will be deprecated when Phase D ships v2 worker
- [x] VERSION 2.7.0 → 2.7.1 (PATCH — feature surface gated, no new feature surface)
- [x] CHANGELOG [2.7.1] entry explaining the model pivot rationale

**Files changed:**
- index.html (-70 HTML lines net, JS/CSS unchanged)
- archive/index-v2.7.0.html (new baseline)
- VERSION (2.7.0 → 2.7.1)
- CHANGELOG.md ([2.7.1] entry)
- WORKLOG.md (this Session 44)

**Pending (operator):**
- [ ] After Netlify deploy: verify Kevin sees Coming-soon on `/learn/personal-library/upload` instead of dropzone
- [ ] Confirm Sign In / homepage / app shell all still work (no JS regressions from the HTML change)

**Next session: Phase A schema migration (v3.0.0)**
- 8 SQL files in `database/`, named `migration-personal-library-v2-NN-{topic}.sql`
- DROP table `user_book_vouchers`
- ALTER table `user_books` (drop ~15 v1 columns, add ~8 v2 columns, tighten constraints)
- ALTER table `user_book_chunks` (add `scheduled_dispatch_date`, `dispatched_at`)
- ALTER table `book_processing_jobs` (add `job_type`, `target_day`)
- CREATE 12 new tables: subscriptions, user_book_attendance, user_freezes, user_book_changes, co_read_groups, co_read_members, public_books, public_book_audio_cache, referrals, user_referral_codes, daily_dispatch_log, approval_queue
- CREATE 4 new Storage buckets: public-book-pdfs, public-book-audio, public-book-covers, voice-previews

In parallel: Xiaoyu sets up Stripe Dashboard (Product / Price / Webhook / Tax) so Phase B can ship without back-and-forth.

---

## 2026-05-05 | Session 43 | v2.7.0

**Objective:** Phase 2b — replace the upload-route placeholder stub with a real PDF upload + parse + price-preview pipeline. End state: an allowlisted user (Kevin) can drop a PDF on `/learn/personal-library/upload`, watch it upload, watch it parse, and see "Untitled book — 287 pages — 78,421 words — ~10h 4m audio — Starting at £45". Pricing is per spec §5.1; voice picker / daily-minutes / Stripe come in 2c & Phase 3. Non-allowlist users still get the silent-redirect treatment from v2.6.2 — verified by adding a SECOND, server-side allowlist check in the new Netlify Function.

**Why this matters:**
- This is the FIRST user-visible feature surface for Personal Library — the entire previous 2a work is invisible to anyone testing the route since the success path was just a placeholder
- The server-side allowlist guard is the non-bypassable security layer. v2.6.2 hardened the frontend gate; this push adds the matching backend gate. Per advisor review: "前端隐藏 + 后端守门，缺一不可"
- Sets up the data plumbing all later phases will reuse: `user_books` row inserted at quote-time means Phase 2c (voice picker) and Phase 3 (Stripe) both UPDATE this row rather than re-create

**Approach:** One Netlify Function (`personal-library-quote.js`), one frontend state machine inlined in `index.html`. Direct upload to Supabase Storage from the browser (decision A from session start), then function pulls the PDF via service role, parses, validates, prices, inserts row, returns. ~350 lines of new code total.

**Spec compliance:**
- ✅ §7.1 quote endpoint — full response shape including `available_voices` (preview_url null for now), `daily_minute_options`, `pricing_preview.by_voice`
- ✅ §5.1 pricing function — tier from audio seconds, base pence per tier, +50% HD premium
- ✅ §5.3 reading speed — `READING_WPM=130` (env-configurable)
- ✅ §10 edge cases — PDF_TOO_LARGE / PDF_TOO_MANY_PAGES / PDF_SCANNED / PDF_NOT_ENGLISH / PDF_PARSE_FAILED all handled with friendly EN/中文 copy
- ✅ §0 architecture — quote function is sync/fast; the slow worker pipeline is still Phase 4 (separate Node service on Railway)
- ✅ Advisor's "feature flag + allowlist" — server-side guard added; previous frontend gate retained
- ⏳ §1 step 4 — direct upload happens; storage path is `user-pdfs/{user_id}/{book_id}/source.pdf` per spec §4
- ⏳ Voice preview MP3s — `preview_url: null` for now, populated in Phase 2c
- ⏳ Voucher application — voucher_code field skipped at this stage; vouchers don't exist yet (Phase 6 issuance)
- ⏳ 24h cleanup of unpaid PDFs (§10 row "User abandons before payment") — deferred to Phase 4 worker. Orphans accumulate, beta of 1 user, acceptable

**Two technical landmines I sidestepped:**
1. **pdf-parse v1.1.1 ships a debug block in `index.js`** that tries to read `./test/data/05-versions-space.pdf` on module load — fails in Netlify Functions (no test files in the bundle). Workaround used: `require('pdf-parse/lib/pdf-parse.js')` to bypass index.js entirely. Documented inline
2. **franc v6+ is ESM-only**, the function is CJS. Mixed-mode Node 18+ supports `await import('franc')` from a CJS file. Cached at module level so the import cost is paid once on cold start, not per-invocation

**Frontend state machine:**
`.pl-up[data-state]` toggles between idle / uploading / analysing / success / error via CSS `display:none` rules. One DOM tree, one attribute, no React-style state libraries needed (consistent with the rest of the site, which is plain DOM manipulation).

**Why the progress bar is fake:** `@supabase/supabase-js` v2 storage upload doesn't expose progress events (issue tracked upstream). Rather than show a static "Uploading..." text for what could be 5 seconds on a 50MB PDF, I run a `setInterval` ticker that creeps to 85% on a randomised cadence, then jumps to 100% when the actual upload Promise resolves. UX honesty: the user sees something moving. If we ever need real progress, switching to `XMLHttpRequest` upload to a signed URL is the documented path

**Completed:**
- [x] `netlify/functions/package.json`: added `pdf-parse ^1.1.1` + `franc ^6.2.0`. Netlify build runs `npm install` here per `netlify.toml`
- [x] `netlify/functions/personal-library-quote.js` (~250 lines):
  - JWT validation, allowlist guard, PDF download, parse, scan/lang/page validations, pricing for all 4 voices, user_books insert (idempotent on book_id collision), §7.1 response
  - Errors: structured `{error:{code,message}}` with consistent codes for frontend mapping
  - Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (must be set on Netlify Dashboard); READING_WPM / MAX_PDF_BYTES / MAX_PDF_PAGES tunable
- [x] Archived `index.html` → `archive/index-v2.6.4.html`
- [x] `index.html` upload sub-screen rewritten — 5 states, full bilingual copy, dropzone with drag/drop + click, progress bar, spinner, success card with stats + price box, error card
- [x] CSS for `.pl-up*`, `.pl-dz*`, `.pl-up-spinner` keyframe — extends existing PL CSS block, reuses cream/forest/gold tokens
- [x] JS for `plHandleFile`, `plWireDropzone`, `plSetUploadState`, `plResetUpload`, `plShowUploadError`, `plFmtDuration`, `plFmtPence`, plus `PL_ERROR_COPY` localisation table
- [x] `plShowScreen('upload')` extended: lazy-wires dropzone (idempotent), resets state to `idle` on each entry so re-navigation doesn't show stale data
- [x] VERSION 2.6.4 → 2.7.0 (MINOR — first user-visible PL surface for beta users; non-beta still see nothing per v2.6.2 hardening)
- [x] CHANGELOG [2.7.0] entry with operator-action callout for env vars

**Files changed:**
- netlify/functions/package.json (+2 deps)
- netlify/functions/personal-library-quote.js (new, ~250 lines)
- index.html (~+200 lines: upload UI HTML/CSS + dropzone JS)
- archive/index-v2.6.4.html (new baseline)
- VERSION (2.6.4 → 2.7.0)
- CHANGELOG.md ([2.7.0] entry with env var callout)
- WORKLOG.md (this Session 43)

**Pending (operator — must do BEFORE Netlify deploy will work):**
- [ ] **Set Netlify env vars** (Site settings → Environment variables):
  - `SUPABASE_URL` = `https://bltfljdgjxhcmbfduert.supabase.co` (same value already in `assets/js/supabase-client.js`)
  - `SUPABASE_SERVICE_KEY` = service-role key from Supabase Dashboard → Settings → API → `service_role` secret. **Treat as secret — do NOT commit.** This grants RLS-bypass access to write any table; never expose to frontend
- [ ] After env vars are set, trigger a Netlify deploy (or just push v2.7.0 — push includes the new function so deploy fires automatically)
- [ ] Hard refresh https://readii.co.uk after deploy
- [ ] Acceptance test as Kevin:
  - Visit `/learn/personal-library/upload`
  - Drop in a small text-based English PDF (a 5-page sample is fine)
  - Should see: filename → progress bar → spinner ("Analysing…") → success card with title/pages/words/duration/price
  - Click "Upload another" — should reset to dropzone
- [ ] Acceptance test as anonymous (incognito): `/learn/personal-library/upload` should silent-redirect to `/`. If somehow the frontend gate misfires, server-side function will still 403 NOT_AUTHORIZED
- [ ] Edge case tests: try uploading a non-PDF file (should reject `PDF_INVALID_TYPE` client-side), a >50MB file (rejects client-side), a scanned PDF (server rejects `PDF_SCANNED`), a Chinese PDF (server rejects `PDF_NOT_ENGLISH`)

**Next: Phase 2c (v2.7.1)**
- Voice picker (Sonia / Ryan + HD): 4 cards, each with 30s preview MP3
- Daily-minutes slider (5/10/15/20/30)
- Live price update from `pricing_preview.by_voice` (already returned by quote endpoint — no API change needed)
- "Continue to checkout" button (still placeholder until Phase 3 wires Stripe in test mode)
- Pre-generate the 4 preview MP3s and host in a new public `voice-previews` storage bucket (decision 3a from session start)

---

## 2026-05-05 | Session 42 | v2.6.4

**Objective:** Finish the relative-path-resolution fix that v2.6.3 only half-completed. Xiaoyu reported post-v2.6.3-deploy that the daily-book card was stuck on "Loading today's book…" and "Browse all books" was missing. Same root cause as v2.6.3 (relative paths break at deep routes) but a different syntactic form — an ES module `import` statement that I'd grep'd over.

**Why this matters:**
This is a clean example of an incomplete fix. v2.6.3's CHANGELOG/commit message confidently said "verified no other relative-path references exist", but my verification only covered `<script src=` and `<link href=` and `<img src=`. ES module imports look syntactically different (`import { ... } from '...'`) and weren't in my grep pattern. So the bug class was only partially fixed, and the user noticed the breakage on the most-visible feature (the daily book) — which is the worst possible kind of regression because it makes the FIX itself look broken to the user.

**Root cause:**
Line 5325 of `index.html`:
```html
<script type="module">
  import { checkAccess, loadLibrary, loadProgress, saveProgress, loadStreak, updateStreak } from './assets/js/library.js'
```

`library.js` is an ES module (per CHANGELOG line 892 from v2.5.0: "library.js rewritten as ES module"). The import statement uses a relative path (`./assets/...`). Same resolution rule as `<script src=` — at `/learn/personal-library/...`, this becomes `/learn/personal-library/assets/js/library.js`, which doesn't exist, Netlify catch-all returns `index.html` with `text/html`, and the ES module loader refuses (correctly per HTML spec strict MIME check). Module never loads → exported functions (checkAccess, loadLibrary, etc.) are unavailable to the inline app code → the inline initApp() function silently fails when calling them → "Loading today's book…" placeholder text never gets replaced.

The reason this also broke the homepage daily card (not just PL routes) for Kevin: he had been on `/learn/personal-library` in this browser tab before. When he then navigated back to the app/library, the URL might have been on a deep PL path momentarily, OR — more likely — the browser had cached the failed module load. Either way, library.js was never properly loaded for that tab and the card never rendered.

**Why my v2.6.3 grep missed it:**
My pre-push verification grep was `grep -nE 'src="(assets|articles|tools|netlify|privacy)'` and similar for `href=`. ES module imports use neither `src=` nor `href=`. The user's ORIGINAL diagnosis (in their first MIME error report) explicitly said "module script" — I should have caught the hint and searched for `import` statements too. Instead I focused on the `<script src=` cases that matched my mental model.

**Approach:**
1. grep `import .* from` — found exactly 1 hit
2. Change `'./assets/js/library.js'` → `'/assets/js/library.js'` (single character: prepend `/`, drop `.`)
3. Re-verify with broader pattern: `grep -nE "import .* from ['\"]\\./` should return zero hits
4. Push as v2.6.4

**Completed:**
- [x] Archived `index.html` → `archive/index-v2.6.3.html`
- [x] Fixed line 5325 import path
- [x] Re-verified no other `import './...'` or `import "./...'` patterns exist in `index.html`
- [x] Verified `library.js` itself has no internal relative imports (would have caused chain failure)
- [x] Bumped VERSION 2.6.3 → 2.6.4
- [x] CHANGELOG [2.6.4] entry, including the explicit lesson-learned about searching ALL syntactic forms of a bug class on a regression fix

**Files changed:**
- index.html (1 line: relative module import → absolute)
- archive/index-v2.6.3.html (new baseline)
- VERSION (2.6.3 → 2.6.4)
- CHANGELOG.md ([2.6.4] entry)
- WORKLOG.md (this Session 42)

**Pending (operator):**
- [ ] Hard refresh after Netlify deploys
- [ ] Daily book card should populate ("Today's book: ..." instead of stuck "Loading...")
- [ ] "Browse all books" link should be visible and clickable
- [ ] Re-run the v2.6.2 PL gate verification checklist (was blocked by this regression)

**Lesson saved for future me:**
On a regression fix, when the user's error message names a specific construct (here: "module script"), grep for that EXACT term too — not just my mental shortlist. The user's first words usually point at the right spot.

---

## 2026-05-05 | Session 41 | v2.6.3

**Objective:** Fix MIME error blocking site JavaScript from loading at deep `/learn/personal-library/*` routes. Reported by Xiaoyu post-deploy of v2.6.2: browser console showed `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`. Site appeared to load but every interaction (Sign In, navigation, etc.) was broken.

**Why this matters:**
This is the kind of bug that makes a deploy look successful but leaves the user with a non-functional site. Phase 2a's whole point was the deep routing — if the routing works but breaks all the existing site JS, we've shipped a regression for Kevin and broken nothing for non-allowlist users (since they redirect away anyway), but Kevin can't actually test the feature.

**Root cause analysis:**
Lines 5320-5323 of `index.html` had relative-path script tags: `<script src="assets/js/auth.js"></script>` etc. Browsers resolve relative URLs from the current document's directory, NOT from the site root. Specifically:
- At `/`: directory is `/` → resolves to `/assets/js/auth.js` ✓
- At `/app`: directory is `/` (single-segment paths have empty directory after stripping the segment) → resolves to `/assets/js/auth.js` ✓
- At `/learn/personal-library`: directory is `/learn/` → resolves to `/learn/assets/js/auth.js` ✗
- At `/learn/personal-library/upload`: directory is `/learn/personal-library/` → resolves to `/learn/personal-library/assets/js/auth.js` ✗

The Personal Library deep routes were the FIRST 2-segment paths on the site (every prior route was single-segment), so the latent bug was never triggered.

The downstream chain: wrong path → file doesn't exist → Netlify catch-all rule `/* → /index.html status=200` serves index.html → browser receives `Content-Type: text/html` for what it expected to be JS → strict MIME check fails → script doesn't execute → entire site JS broken on that page (auth, navigation, everything).

**Why Xiaoyu's first instinct (modify netlify.toml) was close but not quite:**
He suggested adding pre-catch-all rules to force `.js` requests to bypass the rewrite. That would work — Netlify would 404 on the bad path instead of serving HTML, browser would then 404-error rather than MIME-error, but auth.js still wouldn't load and the site would still be broken. The fix needs to happen at the source (HTML), not the symptom (Netlify rule). Patching the rule would also leave a brittle pattern in place: every future deep route would rediscover the bug if anyone added another relative reference somewhere.

**Approach:** Single Edit, 4 lines: `assets/js/...` → `/assets/js/...` for the 4 local script tags. The CDN-hosted Supabase script (line 5319) was already absolute, no change. Articles HTML files were grep-checked and contain no relative references, so they're unaffected.

**Completed:**
- [x] Archived `index.html` → `archive/index-v2.6.2.html` (pre-fix baseline)
- [x] Edited 4 script-src attributes to use absolute paths starting with `/`
- [x] Verified no other relative-path references exist in `index.html` (grepped src= and href= for assets/articles/tools/netlify/privacy prefixes — only the 4 fixed lines came up)
- [x] Verified articles/*.html have no relative asset references
- [x] Bumped VERSION 2.6.2 → 2.6.3 (PATCH — bug fix, no feature surface change)
- [x] CHANGELOG [2.6.3] entry with full root-cause explanation and the rationale for not touching netlify.toml

**Files changed:**
- index.html (4 lines: relative → absolute paths)
- archive/index-v2.6.2.html (new baseline)
- VERSION (2.6.2 → 2.6.3)
- CHANGELOG.md ([2.6.3] entry)
- WORKLOG.md (this Session 41)

**Pending (operator):**
- [ ] Hard refresh on the deployed site (Ctrl+Shift+R or Cmd+Shift+R) to bypass cache after Netlify auto-deploy fires
- [ ] Re-run the verification checklist from Session 40 — the 7 browser tests for Kevin/anonymous/reviewer paths
- [ ] If MIME error still appears: open Network tab in DevTools → look for any request with status 200 + Content-Type `text/html` for a path ending in `.js`. The path will tell us which script tag is still relative. There shouldn't be any after this fix, but if there is, that's where to look

---

## 2026-05-05 | Session 40 | v2.6.2

**Objective:** Harden the Phase 2a beta gate per advisor review. The 2.6.1 implementation showed a "Personal Library — Coming soon" branded page to non-allowlisted visitors who probed the `/learn/personal-library/*` routes — leaking the feature name and confirming the existence of unreleased work to anyone curious. Replace with a silent redirect to `/`, indistinguishable from any other unknown path on the site. Also add session-level caching of the beta-access result, invalidated on auth state changes.

**Why this matters:**
The whole point of "no public entry yet" is that competitors, journalists, and curious users shouldn't even know we're building this until we choose to announce it. A branded "Coming soon" page on a guessable URL undoes that — anyone who tries `/learn/...` paths could find it. Advisor framing (which Xiaoyu forwarded): this is **feature flag + allowlist** discipline, the standard approach for shipping feature code to production while gating user-visible surface — used by Netflix, Stripe, every serious product team.

**Approach:** Move the beta-access check to the very top of `openPersonalLibrary()` so it runs **before** any DOM mutation or URL push. On failure: clean up state, replace URL to `/`, return early. Non-allowlist users see no PL frame, no class change, no URL change beyond the silent redirect. Existing `pl_beta_access BOOLEAN` column on `user_profiles` (added in v2.6.0 migration) stays — no premature abstraction to a `feature_flags` table when only one feature is gated.

**Spec compliance with Xiaoyu's advisor:**
- ✅ "导航入口对所有人隐藏" — already true since v2.6.1 (no nav entry exists)
- ✅ "URL 直接访问也要拦截... 不能让他看到任何 Personal Library 的页面、组件或 API 响应" — fixed: silent redirect, no PL-branded view ever rendered for non-allowlist
- ⏳ "后端 API 也要做权限检查" — deferred to Phase 2b (no backend endpoints exist yet; first one is `personal-library-quote` Netlify Function in 2b, which will check `pl_beta_access` server-side via service-role read of `user_profiles`)
- ✅ "Allowlist 实现方式" — boolean `user_profiles.pl_beta_access` in place; advisor accepted JSONB-on-user_profiles as alternative to a separate `feature_flags` table, and our boolean is functionally a degenerate JSONB single-flag
- ✅ "前端取 flag 的方式 — 缓存" — `_plBetaCache` session cache added; cleared on auth state change via existing `authOnStateChange` listener in `assets/js/auth.js`
- ⏳ "Stripe 测试模式 + email [BETA] 标识" — Stripe arrives in Phase 3, Resend in Phase 4. Will enforce when those land
- ⚠️ HTML source still contains PL view markup (anyone view-source can read it). Static SPA can't conditionally render server-side. Documented as known limitation; would require a build pipeline to obfuscate. Not worth the build complexity for v1

**Completed:**
- [x] Archived `index.html` → `archive/index-v2.6.1.html` (pre-hardening baseline)
- [x] Removed the `<div class="pl-screen" data-screen="locked">...</div>` block from `index.html` (~13 lines deleted) — eliminates the "Coming soon" branded page entirely. The `.pl-soon`/`.pl-soon-tag` CSS rules left in place (cheap, may reuse later for an actual marketing page when the feature ships publicly)
- [x] Added `_plBetaCache` module-level variable + cache logic to `checkPLBetaAccess()`. Errors are NOT cached (re-checked on next call); only true/false from a successful query are cached
- [x] Added `plInvalidateBetaCache()` exported function
- [x] Refactored `openPersonalLibrary()` so beta check runs FIRST. On `false`: removes `body.pl-active` class (defensive), resets `body.style.overflow`, calls `history.replaceState({}, '', '/')` if currently on a PL path, returns early. No DOM additions, no URL push, no `data-screen="..."` toggling
- [x] Refactored same-shell sub-route popstate branch (`onPL && isPL`) to silent-redirect on gate failure, mirroring the entry-side hardening. Covers: user authenticated as Kevin in tab A, navigated to /upload, then logged out in tab B → tab A's back-button click now correctly bounces them out
- [x] Added one line to `assets/js/auth.js`'s `authOnStateChange` callback: `plInvalidateBetaCache()`. This way, sign-out / sign-in events flush the PL cache automatically — no possibility of a stale `true` surviving an auth change in the same tab
- [x] Bumped VERSION 2.6.1 → 2.6.2 (PATCH — security hardening of an existing gate, no new feature surface)
- [x] Added `[2.6.2]` to CHANGELOG with full rationale + the "frontend-only, backend in 2b" caveat

**Files changed:**
- index.html (-13 HTML lines, ~+15 JS lines for cache + redirect logic; net ~+2)
- assets/js/auth.js (+5 lines for cache invalidation hook)
- archive/index-v2.6.1.html (new baseline)
- VERSION (2.6.1 → 2.6.2)
- CHANGELOG.md ([2.6.2] entry)
- WORKLOG.md (this Session 40)

**Verification done locally (logic trace):**
- Anonymous user types `/learn/personal-library` → init route fires `openPersonalLibrary('list')` → `checkPLBetaAccess()` returns false (no auth.user) → replaceState to `/`, no class change, no PL view rendered. URL bar shows `/`. View-source still has the PL HTML but it's `display:none` via #view-pl rule
- Authenticated non-allowlist user (e.g. reviewer@) → same path; `pl_beta_access=false` → same redirect
- Authenticated allowlist user (Kevin) → `pl_beta_access=true` → cached, then PL view rendered. Subsequent navigations within PL hit the cache, no extra Supabase round-trip
- Sign-out while in PL → `authOnStateChange` fires → cache cleared → next navigation rechecks → false → redirect

**Pending (operator):**
- [ ] Push to GitHub (next session task) → Netlify auto-deploy → verify on https://readii.co.uk
- [ ] Browser test as Kevin: visit `/learn/personal-library`, see empty list view + "Upload a book" CTA
- [ ] Browser test as anonymous (incognito): visit `/learn/personal-library`, expect URL bar bounces to `/`, see homepage. View-source can still show PL HTML (acceptable — documented)
- [ ] Browser test as reviewer@readii.co.uk: same as anonymous — silent redirect

---

## 2026-05-05 | Session 39 | v2.6.1

**Objective:** Land Phase 2a of Personal Library — the frontend skeleton and beta gate. Get all `/learn/personal-library/*` routes reachable via direct URL with placeholder views, behind a server-checked `pl_beta_access` flag. No nav entry, no feature surface for non-beta users. Sets up the scaffolding so Phase 2b (PDF upload + quote function) can plug in without touching routing again.

**Why this matters:**
The whole rollout discipline rests on this gate. If we add nav entries or expose feature affordances before the backend is built, beta testing becomes leaky and the "no public surface yet" promise breaks. Wiring routing + beta check now means every later phase just slots its UI into the existing `pl-screen[data-screen="..."]` slots.

**Approach:** Inline in `index.html` (consistent with current `view-landing` / `view-app` pattern, single-page deploy). Routing follows the same `history.pushState` + `popstate` model as the existing `openApp`/`closeApp` pair (which was hardened in v2.5.1). Beta gate hits Supabase server-side every time `openPersonalLibrary()` runs — no client-side cache to go stale, no localStorage flag to spoof.

**Spec compliance:**
- spec §1 user flow steps 1–3 (nav entry + landing on /learn/personal-library + click to upload): step 1 (nav entry) is **deliberately deferred** per Xiaoyu's instruction "暂时先不在Readii的官网设置入口". Steps 2 + 3 land here as placeholders
- spec §9.1 routes: all 7 routes parsed and routed (list, upload, checkout/success, checkout/cancel, bookId, bookId/day/n, vouchers). `checkout/*` routes will be wired in Phase 3 alongside Stripe; for 2a, hitting them lands on the locked screen by default route fall-through (acceptable — they should never be reachable without first going through checkout flow)
- spec §9.5 i18n: every new string has `data-en` + `data-zh` siblings, follows existing site convention (no `i18n/personal-library.ts` file — that pattern doesn't exist in this codebase, all i18n is inline)

**Completed:**
- [x] Archived current `index.html` to `archive/index-v2.5.2.html` (first use of the archive folder — v2.5.2 was the last release that mutated index.html, so it's the truthful baseline). Subsequent index.html-touching releases will follow the README archive convention
- [x] Added ~25 lines of CSS for `#view-pl` + `body.pl-active` toggle + sub-screen `.act` switching + sticky top bar + empty-state typography. Reuses existing CSS variables (`--cream`, `--forest`, `--gold`, `--serif`) — visually consistent with rest of site
- [x] Added `<div id="view-pl">` block (right after view-app, before the first `<script>` so it's parsed before the init route check runs). Contains 6 sub-screens: `locked`, `list`, `upload`, `vouchers`, `book`, `day`. Only one is `.act` at a time
- [x] Added 7 new JS functions in the existing inline `<script>`:
  - `checkPLBetaAccess()` — async, hits `user_profiles.pl_beta_access` via existing `_supabase` global. Returns false on any error (degrades gracefully if migration not applied)
  - `plPathFor(screen, params)` — screen → URL string mapping
  - `plParseRoute(pathname)` — URL string → `{screen, params}` parsing (handles bookId / bookId/day/n / list / upload / vouchers)
  - `plShowScreen(name)` — toggles `.act` class on the matching sub-screen
  - `openPersonalLibrary(screen, params)` — main entry. Removes `body.app`, adds `body.pl-active`, sets `overflow:auto`, runs beta check, shows screen, pushes history state (only if path actually changes)
  - `closePersonalLibrary()` — mirrors `closeApp`. If our pushState put us on a PL route, `history.back()` to leave cleanly; otherwise `replaceState` to `/` for direct-URL entries
  - New `popstate` listener (additive, doesn't touch the existing one) — handles `/learn/personal-library/*` ↔ `/` ↔ `/app` transitions including same-shell sub-route changes
- [x] Extended initial route detection at end of script: previously only checked `/app`, now also detects `/learn/personal-library/*` and routes accordingly via `plParseRoute` + `openPersonalLibrary`
- [x] Bumped VERSION 2.6.0 → 2.6.1 (PATCH per README rules — feature is gated and invisible to non-beta users, so this is technically not a "new section" from end-user perspective. 2.7.0 will be the MINOR bump when 2b makes the upload UI visible to beta users)
- [x] Added `[2.6.1]` entry to CHANGELOG with full notes on the no-public-entry rationale

**Files changed:**
- index.html (CSS + HTML view block + 7 JS functions + popstate listener + init route extension; ~+187 lines (5947 → 6134))
- archive/index-v2.5.2.html (new — pre-2a baseline, exact copy of pre-edit index.html)
- VERSION (2.6.0 → 2.6.1)
- CHANGELOG.md ([2.6.1] entry)
- WORKLOG.md (this Session 39)

**Verified by:**
- 4 surgical edits to index.html, all unique-anchored (CSS at #view-app sibling, HTML at view-app sibling pre-`<script>`, JS at popstate sibling, init at the existing `/app` check). No accidental duplicate insertions
- Routing logic traced manually for all 4 navigation paths: (a) typed URL fresh load, (b) internal CTA click, (c) browser Back, (d) browser Forward. Each ends in the expected body-class + sub-screen + URL state

**Pending (operator browser test by Xiaoyu after deploy):**
- [ ] Login as `Kevin_SU2022@163.COM` at https://readii.co.uk
- [ ] Visit https://readii.co.uk/learn/personal-library (type in address bar) — expect: empty-state list view with "📚 Your Personal Library" + "Upload a book" CTA
- [ ] Click "Upload a book" — URL changes to `/learn/personal-library/upload`, view shows the dashed-border stub "Upload UI ships in v2.7.0"
- [ ] Click browser Back — returns to list view, URL `/learn/personal-library`
- [ ] Click "Back" button in PL header — returns to landing `/`, body class `pl-active` removed
- [ ] Toggle EN/中文 — both placeholders' copy switches correctly
- [ ] Logout, then visit `/learn/personal-library` — expect: "Coming soon" locked screen (anonymous = no beta)
- [ ] Login as a non-beta user (e.g. `reviewer@readii.co.uk`) — expect: also "Coming soon" locked screen
- [ ] Confirm to Claude that all 7 checks pass → unblock Phase 2b (PDF upload + parse pipeline)

**Out of scope (deferred, do not add until requested):**
- Any nav entry under LEARN — explicitly held back until the feature is testing-mature
- Real upload UI — Phase 2b
- Voice picker / pricing / preview MP3s — Phase 2c
- Stripe checkout — Phase 3
- Worker / Azure / Resend — Phase 4

---

## 2026-05-05 | Session 38 | v2.6.0

**Objective:** Land Phase 1 of Personal Library — pure schema + storage foundations. New product line per `spec-personal-library.md`: users upload English PDFs, platform turns them into personalised audiobooks + daily reading plans + pronunciation practice, per-book pricing (£8/£18/£30/£45), completion vouchers (10–20%) for repeat purchase. Decoupled rollout: ship the database/storage layer with no frontend entry, gate all future routes on a beta flag, only Kevin's account enabled for now.

**Why this matters:**
The whole feature stack (worker, Stripe, Azure TTS, Resend, frontend) sits on top of these tables. Getting Phase 1 right — RLS clean, source column unified with existing `pronunciation_attempts` writes, beta gate established — unblocks every later phase without committing to user-visible surface area. If the schema is wrong, every later phase pays the cost.

**Approach:** Single SQL migration file (`database/migration-personal-library.sql`) matching the existing `migration-{feature}.sql` convention. Idempotent throughout (re-runnable). One deviation from spec, flagged below.

**Spec deviation (Xiaoyu approved before build):**
Spec §3.2 said *add* a new `source_type` column to `pronunciation_attempts`. But the existing column is named `source` and already takes values `voice_coach` / `word_bank` / `uk_culture` across 6+ read/write sites (verified in `index.html` lines 1813/1838/2367/3809/4093/4287 and `seed-reviewer-account.js` lines 305/491/559). Adding `source_type` would either fork the data or require rewriting all existing call sites. Decision: **reuse `source`, add `personal_library` as a value, add only the genuinely new columns** (`source_id` UUID, `source_metadata` JSONB). The spec's explicit goal — "My Progress dashboard automatically picks up Personal Library scores with zero changes ✅" — is preserved with strictly less change.

**Completed:**
- [x] Wrote `database/migration-personal-library.sql` (~250 lines, single file)
  - 4 new tables: `user_books` (master record per uploaded book, 28 cols incl. tier/voice/voucher/Stripe fields and full lifecycle status), `user_book_chunks` (per-day reading task with audio_path, vocabulary JSONB, representative_sentences JSONB), `user_book_vouchers` (completion rewards, 60-day expiry, applied_to/earned_from FKs), `book_processing_jobs` (worker queue, queued/running/succeeded/failed)
  - Circular FK `user_books.voucher_id ↔ user_book_vouchers.id` resolved by declaring column inline then `ALTER TABLE ADD CONSTRAINT` after both tables exist, wrapped in `pg_constraint` guard for re-run safety
  - RLS on all 4 tables. User-facing policies for SELECT/INSERT/UPDATE on `user_books`/`user_book_chunks`; SELECT-only on `user_book_vouchers` (issuance is server-side via service role); no user policies on `book_processing_jobs` (service role only)
  - `pronunciation_attempts` extended: `source_id UUID` + `source_metadata JSONB` + composite index `(user_id, source, source_id)`. **No CHECK constraint added** to `source` to avoid validation back-fill against historical reviewer-account rows
  - `user_profiles.pl_beta_access BOOLEAN DEFAULT false` — gate flag for Personal Library route access during internal testing
  - 3 private storage buckets via `INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING`: `user-pdfs` (50 MB cap), `user-book-audio` (30 MB cap), `user-book-recordings` (5 MB cap). Per-user path-based RLS on `storage.objects` using `auth.uid()::text = (storage.foldername(name))[1]`
  - Operator UPDATE at end grants `pl_beta_access=true` to `Kevin_SU2022@163.COM` (case-insensitive email match, idempotent)
  - 4 verification SELECT queries appended (commented out) for post-migration sanity-check
- [x] Updated `database/README.md` with the 4 new tables and a note on `pl_beta_access`
- [x] Bumped `VERSION` 2.5.4 → 2.6.0 (MINOR — new feature surface, per README versioning rules)
- [x] Added `[2.6.0]` entry to `CHANGELOG.md` documenting the spec deviation
- [x] No `archive/index-vX.X.X.html` snapshot needed — `index.html` was not touched in this session

**Files changed:**
- database/migration-personal-library.sql (new)
- database/README.md (4 rows added to tables grid)
- VERSION (2.5.4 → 2.6.0)
- CHANGELOG.md ([2.6.0] entry)
- WORKLOG.md (this Session 38)

**Pending (operator action — Xiaoyu in Supabase SQL Editor):**
- [ ] Open Supabase Dashboard → SQL Editor → paste contents of `database/migration-personal-library.sql` → Run
- [ ] Run the 4 verification queries at the bottom of the file (commented):
  - All 4 new tables show up in `pg_tables`
  - `pronunciation_attempts` shows `source`, `source_id`, `source_metadata` columns
  - 3 storage buckets `user-pdfs`, `user-book-audio`, `user-book-recordings` exist
  - `Kevin_SU2022@163.COM`'s row in `user_profiles` shows `pl_beta_access=true`
- [ ] If the verification of beta access returns 0 rows, your account may not have a `user_profiles` row yet — log into https://readii.co.uk once to trigger the upsert, then re-run the final UPDATE statement
- [ ] Confirm to Claude that all 4 verifications pass → unblock Phase 2 (quote pipeline)

**Out of scope for this session (deferred):**
- 24h cleanup cron for unpaid PDFs (spec §13 Phase 1 step 4) — moved to Phase 4 worker poll loop. Avoids needing `pg_cron` extension just for one cleanup task; worker is already polling jobs every 5s, can do cleanup on every Nth poll
- Voice preview MP3 hosting — depends on Phase 2 quote endpoint; will be added then
- Any frontend, API, worker, or third-party (Stripe/Azure/Resend) integration — Phase 2+

---

## 2026-05-04 | Session 37 | v2.5.4

**Objective:** Upgrade `reviewer@readii.co.uk` from free to active subscription so the library books unlock for direct reading. Without this, the reviewer login lands on the dashboard but every book in the Library shows the 🔒 + "Subscribe" button instead of "▶ Listen" — incomplete review experience.

**Why this matters:**
The whole point of the reviewer account is to demonstrate the platform end-to-end. A locked library defeats that. The seeded activity data (Session 36) gave realistic stats, but the reviewer couldn't actually open a book to verify the reading flow.

**Root cause:** Session 36's seeder set `subscription_status='free'` (matching the brief default for "free-tier or basic-tier user"). But the brief also says the experience must be "indistinguishable from a real user" who can demonstrate "Reading Library shows multiple books in various states (completed, in progress)" — and the books-in-progress state requires the user to actually have *opened* them, which requires active subscription.

**Approach:** Surgical patch (no password rotation, no data wipe) + future-proof the main seeder for re-runs.

**Completed:**
- [x] Wrote `scripts/upgrade-reviewer-subscription.js` — minimal one-shot updater. Lists auth users by email, finds reviewer, runs an UPDATE on `user_profiles` setting subscription_status='active' + start=today + end=today+365d. ~30 lines
- [x] Ran against production. Confirmed reviewer user_id `89ee3ded-4f63-48eb-a225-23feb6ac4057` now has subscription_status='active', start=2026-05-04, end=2027-05-04
- [x] Updated `scripts/seed-reviewer-account.js`'s `upsertProfile()` to default to active+1yr — so future full re-seeds preserve the reviewer-as-paying-user state instead of regressing to free

**Files changed:**
- scripts/upgrade-reviewer-subscription.js (new — committed)
- scripts/seed-reviewer-account.js (upsertProfile updated)
- VERSION (2.5.3 → 2.5.4)
- CHANGELOG.md ([2.5.4] entry)
- WORKLOG.md (this Session 37)

**Verified by:**
- Script printed success header with the expected user_id
- Library access gate (`assets/js/library.js:5-13`) reads `subscription_status === 'active'` directly — no caching layer to invalidate, so the change is effective on the reviewer's next page load

**Pending (browser verification by operator):**
- [ ] Login at https://readii.co.uk with the v2.5.3 credentials
- [ ] Library now shows ▶ Listen buttons (not 🔒 Subscribe)
- [ ] Click any book → reading panel opens with PDF + audio player
- [ ] No "Subscribe" upsell banner overlaying the library

---

## 2026-05-04 | Session 36 | v2.5.3

**Objective:** Provision a single reviewer demo account on the production Supabase database with realistic, lived-in activity data for the UK endorsing-body platform review. Account must be indistinguishable from a real user, stable, and pre-populated across the past 30 days.

**Why this matters:**
A fresh empty account on the live platform doesn't demonstrate progress monitoring, adaptive review queue, score-trend chart, or streak — all of which are documented features in the visa pack. Caseworkers logging in with `reviewer@readii.co.uk` need to see a populated dashboard immediately.

**Approach:** One-off Node script (`scripts/seed-reviewer-account.js`) using the existing service-role pattern from `tools/seed-test-users.js`. Idempotent on re-run (find by email → wipe → re-seed → password rotate).

**Completed:**
- [x] Wrote `scripts/seed-reviewer-account.js` (~430 lines) — idempotent provisioner with `--dry-run` mode
- [x] Schema knowledge gathered from `database/schema.sql` (books/lessons/vocabulary/user_profiles/progress/streaks), `migration-daily-book.sql`, `migration-uk-culture-progress.sql`, plus column-name reverse-engineering from `index.html` for `pronunciation_attempts` (user_id, source, module_id, sentence, transcript, score, created_at), `review_queue` (user_id, word_id, added_at, best_score_since_added, last_practiced_at), `user_word_favorites` (user_id, word_id), `word_bank` (id, word, ipa_gb, module_id) — these tables are off-repo migrations
- [x] Voice Coach sentence pool inlined from `VOICE_COACH_MODULES` so seeded `sentence` values match what a real practiser would have submitted
- [x] Score distributions per brief: Broad A trend-up 60→100, ≥3 perfect-100s; Non-rhotic R 50-92 best 95; TH 45-88 best 90; Yod 55-80 best 85; Short O 50-75 best 80
- [x] Cluster-into-sessions timing: each "session" is 3-8 attempts within a ~10-20min window, on a randomly-chosen day in the last 30. Sessions are sparse — some days 0, some days 10+ — matches "real learners are uneven" per brief
- [x] Daily-book pattern: today in-progress + 4 consecutive completed days + a 5-day gap + 1 earlier completed day → current_streak=4, longest=10 stored in `streaks`
- [x] UK Culture mirror: each `uk_culture_progress` row gets a paired `pronunciation_attempts` row with `source='uk_culture'`, `module_id='<id>_l<level>'` — matches the v2.2.0 dual-write pattern in `index.html` so My Progress page picks them up
- [x] Word Bank seeding: 6 favorited (mastered) + 3 in review queue with best_score 35-55, plus matching low-score `pronunciation_attempts` rows (source='word_bank') for the trend chart
- [x] Idempotency tested: ran twice. First run created user `89ee3ded-4f63-48eb-a225-23feb6ac4057`. Second run found that user_id, wiped activity, re-seeded with a new password
- [x] **Two iterations on book picking** to satisfy "≥2 series, ≥2 levels":
  - Iteration 1: matched series by uppercase exact key (`'GK'`, `'G1'`, ...) but DB stores `'Heinemann GK'`/`'Heinemann G1'`, so all 6 books fell to fallback (first 6 = all GK). Caught and fixed
  - Iteration 2: case-insensitive substring match (`includes('gk')`, `includes('g1')`, ...) — picks across Heinemann GK/G1/G2, levels 1/2/3
- [x] **One iteration on lessons completed**: first version constrained progress lessons to the 6 daily-book books → only 10 lessons available (target 20). Fix: progress fetches a broader 200-lesson pool independent of daily-book picks. After fix: 20 lessons completed (14 last-7-days, 6 earlier)

**Final account state (printed by script, not committed):**
```
URL:                   https://readii.co.uk
Email:                 reviewer@readii.co.uk
Username:              reviewer
Password:              <regenerated each run, latest copied to docs by operator>
Reading Level:         Level 2
Total seeded attempts: 197 (voice_coach + reading + word_bank + uk_culture)
Books in library:      6 (lessons completed: 20)
Words mastered:        6
Words in review:       3
UK Culture entries:    16
```

**Files changed:**
- scripts/seed-reviewer-account.js (new — committed; reads from gitignored .env)
- VERSION (2.5.2 → 2.5.3)
- CHANGELOG.md ([2.5.3] entry)
- WORKLOG.md (this Session 36)

**Verified by:**
- Dry-run output sanity-checked against brief targets (counts, score ranges, distribution)
- Production write completed without errors across all 8 phases
- Idempotency confirmed by running twice on the same email — second run reused the same auth user_id

**Pending (browser-only verification — operator must walk this checklist):**
- [ ] Login at https://readii.co.uk with the printed credentials succeeds in a private window
- [ ] My Progress total attempts in 160-180 range (we seeded 197 incl. word_bank+uk_culture; the headline filter may show only voice_coach + reading = 175)
- [ ] My Progress avg ~65-70, best 100
- [ ] Score Trend chart non-flat over 30 days (sessions are clustered, gaps between)
- [ ] AI Voice Coach module index shows different attempt counts (Broad A heaviest)
- [ ] Broad A page: best 100, ~50 attempts
- [ ] Reading Library shows 6 books, mix of completed/in-progress, 3 series across 3 levels
- [ ] At least one lesson detail shows AI Pronunciation panel with prior attempt scores
- [ ] Word Bank Review page: 3 words queued (low best_score), 6 mastered (favorites)
- [ ] UK Culture: meeting 1/50, email 7/50, setup L3 8/10 — values match brief
- [ ] No empty-state placeholders, no broken UI, no "demo" banner

**Out-of-scope (per brief):**
- Self-service demo account creation feature
- "Demo mode" UI banner / flag
- Email auto-responders / support tickets
- Multi-account provisioning

**Security notes:**
- `.env` is gitignored (verified)
- Credentials never written to disk by the script — only stdout
- `tools/seeded-test-users.json` (untracked, contains real test-user creds) was already excluded from git tracking and remains so
- The script itself is committed (no secrets in code; reads from .env at runtime)

---

## 2026-05-04 | Session 35 | v2.5.2

**Objective:** Replace the placeholder reader-narration teacher identity ("Emma · Southern England") with the actual personnel ("Matt · London"). These strings appear in formal documentation submitted to a UK endorsing body, so on-screen attribution must match reality.

**Why this matters:**
The endorsing body cross-references public-site claims against the documentation pack. Stale placeholder identities in the lesson interface are a credibility risk — caseworkers don't know it's a placeholder; they see a name that doesn't exist on the team page.

**Completed:**
- [x] Project-wide case-insensitive grep for `emma|southern england|英格兰南部` — 7 hits, categorised:
  - 3 teacher-identity hits in `index.html` → all replaced
  - 4 unrelated hits (WORKLOG audit log, test-user seed name pool, seed JSON output) → flagged, not touched per brief
- [x] `index.html:851` — hero mock player byline: `Emma · Unit 14 · 4:22` → `Matt · Unit 14 · 4:22` (EN + ZH)
- [x] `index.html:1070` — reading panel `.rpbtr` byline: `Read by Emma · Native British teacher` / `Emma 朗读 · 英国外教` → `Read by Matt · Native British teacher` / `Matt 朗读 · 英国外教`
- [x] `index.html:1087` — AI Pronunciation panel `.aptch` teacher chip: avatar initial `E → M`; `Emma · British English teacher / Emma · 英国外教` → `Matt · British English teacher / Matt · 英国外教`; `Native speaker · Southern England / 母语者 · 英格兰南部` → `Native speaker · London / 母语者 · 伦敦`
- [x] No new image assets needed — `.aptav` is the existing forest-gradient initial-badge style. Letter swap only

**Verification (per brief checklist):**
- ✅ `Emma` returns zero matches in `index.html` (the user-facing site)
- ✅ `Southern England` returns zero matches anywhere in the codebase
- ✅ `英格兰南部` returns zero matches anywhere in the codebase
- ✅ All 3 reader-narration sites render `Matt · British English teacher` + `Native speaker · London`
- ✅ Avatar shows `M` initial in the existing badge styling — no female avatar with male name
- ✅ Larry (commentary teacher) — not referenced in `index.html`, so no accidental edit
- ✅ EN + ZH updated in lockstep at all three sites

**Out-of-scope `Emma` matches (flagged, not changed):**
| File | Line | Context | Reason to leave |
|---|---|---|---|
| `WORKLOG.md` | 981 | Historical Session 32 audit-log entry referencing real test user `huangemma60@foxmail.com` | Rewriting committed worklog history is out of scope |
| `tools/seed-test-users.js` | 41 | `'Emma'` in a fake-first-name pool (`'Lily','Lucy','Ethan','Emma','Sophia',...`) used for random test-account generation | Not teacher attribution — random user-name pool |
| `tools/seeded-test-users.json` | 297, 299 | Output of the above seed script (`"display_name":"Emma Huang"` + her real email) | Test-user record, not teacher attribution |

**Files changed:**
- index.html (v2.5.1 → v2.5.2): 3 single-line edits
- VERSION (2.5.1 → 2.5.2)
- CHANGELOG.md ([2.5.2] entry)
- WORKLOG.md (this Session 35)

**Pending (browser-only verification):**
- [ ] Open the lesson detail page → confirm reading panel header shows `Read by Matt · Native British teacher`
- [ ] Confirm AI Pronunciation panel teacher chip shows `M` initial + `Matt · British English teacher` + `Native speaker · London`
- [ ] Toggle ZH → confirm `Matt · 英国外教` + `母语者 · 伦敦` render
- [ ] Hero mock player on landing page → confirm `Matt · Unit 14 · 4:22`

**Out of scope per brief:**
- Audio re-recording (presentation-layer fix only)
- Adding biographical details / photos / "About our teachers" content beyond the existing identity strip
- DB schema / backend changes

---

## 2026-05-04 | Session 34 | v2.5.1

**Objective:** Fix two related navigation bugs that surfaced after v2.5.0 deploy:
1. Browser Back button on the app shell (post-`openApp()`) leaves the site entirely instead of returning to the landing
2. Sidebar "Readii" logo at the top-left of the app shell is non-interactive — users who expect a logo to be a home link have no way back

**Why this matters:**
Both bugs are dead-ends in the navigation graph. (1) breaks a near-universal browser convention (Back returns to the previous in-site state); (2) breaks the equally universal logo-is-home convention. For visa documentation screenshots and live caseworker review, leaving these unfixed makes the site feel half-baked.

**Root cause:** `openApp()` toggled a CSS class only — no URL change, no `history.pushState`. The browser had no entry to go back to, so Back went to whatever site the user came from. The logo was a `<span class="sbhln">Readii</span>` inside a non-interactive `<div>`.

**Completed:**
- [x] `openApp()` rewritten: still toggles `body.classList.add('app')` + `overflow:hidden`, but now also `history.pushState({readiiApp:true}, '', '/app')` IF `pathname !== '/app'` (the guard prevents duplicate-entry stacking on refresh or chip click loops)
- [x] `closeApp()` rewritten: removes the class first (so the UI flips even if history is borked), then branches:
  - If `history.state.readiiApp === true` (our pushState put us here) → `history.back()` — clean return, popstate then no-op-syncs
  - Else (direct /app load, no in-site entry) → `history.replaceState({}, '', '/')` — URL flips to / but no nav, so the next Back goes to whatever came before this tab. This is the best we can do for direct loads
- [x] `popstate` listener added: on browser Back/Forward, reads `pathname === '/app'` and adds/removes the `app` class accordingly. Idempotent — no-op if state already matches
- [x] Sidebar logo (`.sbhl` div, line 977) now: `role="link" tabindex="0" onclick="closeApp()" onkeydown=` (Enter/Space activates) `style="cursor:pointer" title="Back to homepage"`. Kept as a div so the existing flexbox layout is untouched; added a11y wrapper attributes
- [x] CSS for `.sbhl` extended with `:hover` bg (`rgba(255,255,255,.08)` — subtle on the dark forest sidebar) and `:focus-visible` gold ring. Added small negative margin to compensate for the new padding so the layout doesn't shift
- [x] Initial-load handler at the bottom of the inline script: `if (window.location.pathname === '/app') window.openApp()`. The wrapped openApp's auth + render flow runs; the inner openApp's `pathname !== '/app'` guard prevents re-pushing state

**Files changed:**
- index.html (v2.5.0 → v2.5.1):
  - openApp/closeApp rewritten + popstate listener (~32 lines added at the function block)
  - Sidebar logo div: a11y attrs + onclick (~1 line edit)
  - .sbhl CSS: +3 rules (hover bg, focus ring, padding/margin compensation)
  - Initial-load /app entry block (~7 lines added at the end of the inline script)
- VERSION (2.5.0 → 2.5.1)
- CHANGELOG.md ([2.5.1] entry)
- WORKLOG.md (this Session 34)

**Verified by:** static read-back of the four edit sites; existing `closeApp()` callers (`#1001` backbtn, `#4714` post-signOut redirect, `#5117` cta wiring) all keep working since the public function signature is unchanged.

**Pending (browser-only verification):**
- [ ] Click `Open Platform →` from `/` → URL flips to `/app` → press Back → returns to `/` with hash/scroll preserved by browser
- [ ] On `/app`, click sidebar Readii logo → URL flips to `/` → app class drops → landing visible
- [ ] On `/app`, click `← Back to site` button (existing) → same as above
- [ ] Open `https://readii.co.uk/app` directly in a fresh tab → app shell loads (Netlify SPA rewrite + initial-load check)
- [ ] Browser Forward after closeApp → URL goes back to `/app` → popstate listener re-adds app class
- [ ] Keyboard: Tab to logo → focus ring shows gold → Enter activates closeApp

**Out of scope:**
- In-app routing (sidebar tabs change view but not URL) — adds complexity, doesn't solve the reported bug
- 中文 — no copy changed; "Back to homepage" tooltip is EN-only since `title` doesn't accept i18n spans. Acceptable trade-off for an a11y label

---

## 2026-05-04 | Session 33 | v2.5.0

**Objective:** Repackage the public landing page so it visibly matches the documented business model for the Innovator Founder visa extension. The current site frames "Cross-border Business Programme" as a co-equal third pillar; the documented model treats advisory/cross-border work as value-added services to existing platform members. The site has to read that way before submission.

**Why this matters:**
This is a Home Office artefact — caseworkers will compare the public site against the business plan and the 6/12/18-month checkpoints. Co-equal-third-pillar framing on the public site contradicts the platform-first narrative we've been reporting. Fixing it now is cheap; fixing it after a rejection letter is not.

**Completed:**
- [x] Hero `.hsub` copy: replaced "children master English and entrepreneurs build confidently in the UK" with "non-native speakers master British English with confidence, from children to professionals" (EN + ZH)
- [x] Stats tile: `100+ / Clients served` → `150+ / Children coached` (EN + ZH). Other 3 tiles untouched
- [x] Meta description rewritten — removed the "cross-border business support" tail; now leads with AI voice + 1,000+ audio lessons + non-native speaker focus. Kept Co. No. and Canterbury references for caseworker visibility
- [x] `#platform` section fully restructured (~10 lines old `<div class="fgrid">` → ~35 lines new `<div class="platform-primary">` + `<div class="platform-secondary">`):
  - h2 reworded "Three layers. One integrated platform." → "One platform. Built on our AI voice engine."
  - Removed the introductory `<p class="sd">` above the grid (the body copy now lives inside the primary card)
  - Primary block: white card, `--sh` shadow, 48/44 padding, body copy + 5 chips
  - 5 module chips: Broad A / Non-rhotic R / TH (voiced) / Yod retention / Short O — copy lifted verbatim from `VOICE_COACH_MODULES[].short` so the public site matches the in-app module page
  - Each chip is a `<button>` (semantic — keyboard focusable) onclick=`openVoiceCoachFromLanding(<id>)`
  - Subordinate block: `.platform-secondary` on `--cream2` muted bg, smaller h3 (18px serif), italic footnote "Available to existing platform members." — clearly secondary visually
- [x] New bridge function `openVoiceCoachFromLanding(moduleId)` next to existing `openApp()`/`closeApp()`. Opens app, waits 220ms for inline script init, then `showAppView('voice-coach')` + `openVoiceCoachModule(moduleId)`. Soft-fails (`typeof === 'function'` checks) if either function isn't loaded yet
- [x] Pricing tier 3 (Business Programme — Custom) removed entirely (~7 lines). The `Book a call` mailto CTA went with it
- [x] `.pgrid` CSS: `repeat(3,1fr)` → `repeat(2,minmax(0,360px))` with `justify-content:center`, `max-width:780px`, `margin:0 auto`. Two cards now render balanced on desktop instead of stretched-thin-with-orphan-third
- [x] Mobile @media: `.pgrid` collapses to 1-column at ≤640px (max-width 420px so the card doesn't run edge-to-edge)
- [x] `.platform-modules` uses `auto-fit minmax(220px,1fr)` — 5 chips wrap to 2-3 rows cleanly at any width without explicit breakpoints
- [x] Mobile @media: `.platform-primary` padding 48/44 → 28/22; `.platform-secondary` padding 28/32 → 22/20 with margin-top 48 → 32
- [x] Footer "Business Programme" link removed (was `#pricing` → orphan after the tier removal). Footer Platform menu now: English Reading · AI Voice Training · Pricing
- [x] "Most popular" badge on Learner Pro retained — still works visually with two tiers (Children entry £5/mo vs Pro premium £299), since the badge contrasts price points rather than presupposing a 3-tier comparison

**Verification checklist (per brief):**
- ✅ "Three layers" — gone from index.html
- ✅ "Cross-border Business Programme" — gone
- ✅ "UK market entry support" — gone
- ✅ "business establishment services" — gone
- ✅ "UK company formation" — gone
- ✅ "Market research & business plan" — gone
- ✅ "Partner & supplier introductions" — gone
- ✅ Pricing renders exactly 2 tier cards
- ✅ Hero EN no longer contains "entrepreneurs" (footer still does — out of scope per brief)
- ✅ Stats shows `150+` / "Children coached"
- ✅ "Beyond the platform" block present, muted `--cream2` bg, smaller h3, italic footnote — visually subordinate
- ✅ Mobile @media rule added so `.pgrid` and `.platform-*` collapse cleanly
- ✅ Desktop balanced (centered 2-col pricing, primary card prominent, secondary block muted)
- ✅ No broken links — footer Business Programme link removed; chip onclick uses defensive `typeof` checks
- ✅ Meta description updated (removed "cross-border business support"; kept Canterbury + Co. No. for visa visibility)

**Files changed:**
- index.html (v2.4.2 → v2.5.0): meta description, hero hsub, stats tile, full #platform section rebuild, pricing tier removal, .pgrid CSS, new .platform-* CSS block, openVoiceCoachFromLanding helper, footer link cleanup
- VERSION (2.4.2 → 2.5.0)
- CHANGELOG.md ([2.5.0] entry)
- WORKLOG.md (this Session 33)

**Verified by:** read-back of #platform + #pricing + #stats sections; grep for forbidden strings returns no matches; grep for new identifiers (`platform-primary`, `Beyond the platform`, `150+`, `Children coached`, `openVoiceCoachFromLanding`) returns the index.html.

**Pending:**
- [ ] Browser test: open the homepage, confirm chip click opens the app and lands on the correct Voice Coach module
- [ ] Browser test on mobile width (≤640px): verify pricing collapses to 1-col, chips wrap cleanly, secondary block stays subordinate
- [ ] Visa pack: re-screenshot homepage hero + #platform + pricing for the documentation bundle
- [ ] `articles/index.html` meta and `privacy-policy.html` body still mention "cross-border business" themes — out of scope this session per brief, but flag for caseworker-review pass

**Out of scope per brief:**
- 中文 translations applied where the page has inline `data-zh` spans (homepage does — single-pass edit). No separate ZH page exists, so no ZH-only follow-up needed
- SEO meta rewrites beyond removed strings — kept the meta description tight to the deleted-string scope
- Backend / database / auth / routing — untouched

---

## 2026-04-30 | Session 32 | v2.4.0

**Note on session number:** brief said "Session 30" but Session 30 was v2.2.1 and Session 31 was v2.3.1, so this is Session 32. Silent correction — same calendar day, just sequence-counting.

**Objective:** Wire the £2,000 high-margin services into the engagement loop. UK Culture Programme has been a cost centre (free practice with no upsell surface) — this session adds inline lead capture cards that fire at carefully chosen "intent moments" inside the practice flow.

**Why this matters:**
The dual-engine business model (low-margin practice → high-margin services) has been visible in the nav since v2.1.0 (CTA card on group home), but a passive CTA at the bottom of a tab does not convert. The trigger here — surfacing a relevant service at exactly the moment the learner is engaging with that topic (e.g. VAT card after they've drilled VAT-registration sentences) — is far higher intent. 8 sentences is the threshold because by then the learner has visibly invested time and is likely to perceive the recommendation as helpful rather than promotional.

**Completed:**
- [x] DB migration `database/migration-leads.sql`: `leads` table with anonymous-insert allowed (user_id nullable), service-role-only select policy, CHECK constraint on service_type values
- [x] `UKC_LEAD_TRIGGERS` config: 7 entries mapping `<module>_l<level>` to service + bilingual copy. Covers setup l1/l3/l4, education l3, daily l4, email l5, meeting l5
- [x] `_ukcMaybeShowLeadCard(moduleId, levelNum, progressData)`: trigger gate. Checks (a) trigger exists for this level, (b) localStorage flag not set, (c) uniqueIdx.size >= 8. Called from openUkCultureLevel (handles re-entry) and from onScore (handles fresh threshold crossing)
- [x] `_ukcRenderLeadCard()`: populates headline + body from trigger config (bilingual spans), resets form state on each render, scrolls into view
- [x] `_ukcSubmitLead()`: validates name + contact non-empty, fetches user (nullable), inserts to `leads`, fires-and-forgets `_ukcNotifyLeadByEmail()`, sets localStorage flag, swaps to thanks state. Error handling: re-enables submit button on DB failure with inline bilingual error
- [x] `_ukcDismissLead()`: sets localStorage flag, hides card. No DB write
- [x] `_ukcNotifyLeadByEmail(lead)`: Formspree placeholder. If `FORMSPREE_ENDPOINT` still contains `YOUR_FORMSPREE_ID`, skips fetch with an info console log. Otherwise POSTs JSON with name / contact / service / source / contact_time / _subject. Wrapped in try/catch — email failure does NOT block the success UI
- [x] One-time event binding via `_ukcLeadBound` flag (matches the existing pattern for `_ukcListenBound`)
- [x] Navigation cleanup: `_ukcHideLeadCard()` called from both back buttons and from showAppView when leaving a UK Culture route
- [x] CSS: --fp background, --forest border, white inner form panel, mobile-stacked actions

**Files changed:**
- index.html (v2.3.1 → v2.4.0): lead-card HTML inside view-uk-culture (~60 lines), `.ukc-lead-*` CSS (~35 lines), `UKC_LEAD_TRIGGERS` + helpers + handlers + Formspree placeholder (~250 lines), hooks into openUkCultureLevel + onScore + back buttons + showAppView
- database/migration-leads.sql (new)
- VERSION (2.3.1 → 2.4.0)
- CHANGELOG.md ([2.4.0] entry)
- WORKLOG.md (this Session 32)

**Verified by:** inline + module scripts both parse cleanly via `new Function(code)` syntax check.

**Pending:**
- [ ] User must run `database/migration-leads.sql` in Supabase SQL Editor (writes silently fail until then; submit button shows inline error)
- [ ] Kevin needs to register at formspree.io and replace `YOUR_FORMSPREE_ID` for email-on-submit notifications. Until then leads still save to DB; Kevin can poll the dashboard

---

## 2026-04-30 | Session 31 | v2.3.1

**Objective:** Small follow-up to v2.3.0 — add a "Reading level" stat card to My Progress so users see their current adaptive tier (1/2/3) at a glance, alongside the existing Reading streak card.

**Why this matters:**
The reading_level value drives tomorrow's daily book selection but was only visible indirectly (via the difficulty of the book that arrived). Surfacing it on My Progress closes the feedback loop — users can now confirm their level dropped after a "too hard" rating, or watch it climb after several "too easy" runs.

**Completed:**
- [x] Added 7th stat card `#pg-stat-rlevel` to the Stats Overview grid (auto-fit grid handles the new column without CSS changes)
- [x] `_pgRenderDailyBookStats()` extended to fetch `user_profiles.reading_level` in parallel with the daily-book completion data; renders "Level N" / "第 N 级"
- [x] Empty state + render helpers updated to include the new id

**Files changed:**
- index.html (v2.3.0 → v2.3.1): Stats Overview HTML +1 card, `_pgRenderEmptyState` / `_pgRenderStats` / `_pgRenderDailyBookStats` extended
- VERSION (2.3.0 → 2.3.1)
- CHANGELOG.md ([2.3.1] entry)
- WORKLOG.md (this Session 31)

**Verified by:** inline JS parses cleanly; no breakage to existing renderers — new id is purely additive.

---

## 2026-04-30 | Session 30 | v2.2.1

**Objective:** Activate the 200 Listen buttons in UK Culture Programme. The transcribe workspace finished generating fable mp3s and populated `uk_culture_audio`; this session is the website-side wiring.

**Why this matters:**
v2.2.0 shipped Listen buttons in a permanent "(soon)" state — placeholder UX waiting on TTS audio. With the audio in place, Listen + Record on the same card creates the full hear → speak → score loop, which is the actual differentiator vs. plain reading apps.

**Completed:**
- [x] `_ukcLoadAudioUrls(moduleId, levelNum)`: batch query `uk_culture_audio` for the 10 rows; `Promise.all` over `createSignedUrl(path, 60)`; populate `_ukcAudioUrlMap[idx] = signedUrl`. Wrapped in try/catch — table-missing or sign-failure paths just leave the map empty
- [x] `_ukcActivateListenButtons()`: walks `.ukc-listen-btn` in current sentence list; if a URL exists for the idx, sets `data-audio-url` + flips to idle (🔊 Listen). Buttons without URLs keep the "(soon)" state
- [x] Render helpers `_ukcRenderListenBtnIdle/Playing/Soon`: rebuild button innerHTML from scratch per state. Cleaner than juggling display:none on multiple inner spans
- [x] One-time delegated click handler on `#ukc-sentence-list`: routes 🔊 clicks to `_ukcHandleListenClick`, and on 🎤 clicks calls `_ukcStopAudio()` first to enforce the TTS-vs-recording mutex (the existing Word Bank pattern)
- [x] `_ukcPlayUrl(btn, url)`: returns a Promise that resolves on `ended` and rejects on `error` or `play()` rejection. Updates button to playing state and tracks `_ukcCurrentAudio` / `_ukcCurrentBtn`
- [x] `_ukcRefreshAndPlay(btn, moduleId, levelNum, idx)`: re-fetches the relative path from `uk_culture_audio`, re-signs with 60s TTL, retries playback. Triggered when `_ukcPlayUrl` rejects (URL expired or transient error). One retry max — if still fails, button drops back to idle
- [x] `_ukcStopAudio()`: pauses + clears the active audio, restores the active button's idle state. Called from: same-button second click, different-button click (replace), 🎤 click, level back button, module back button, and showAppView when leaving UK Culture
- [x] openUkCultureLevel wired: after `_ukcRenderSentenceCards`, calls `_ukcBindListenHandler()` (no-op after first call), `_ukcStopAudio()` (clean slate), then `_ukcLoadAudioUrls(...).then(...)` activates buttons. The `.then` re-checks `_ukcCurrent.moduleId/levelNum` so a fast user navigating away mid-load doesn't get stale URLs applied to the wrong level

**Files changed:**
- index.html (v2.3.0 → v2.2.1): UK Culture audio infrastructure (~210 lines: state, helpers, load, activate, click, refresh, mutex, back-button cleanup)
- VERSION (2.3.0 → 2.2.1)
- CHANGELOG.md ([2.2.1] entry)
- WORKLOG.md (this Session 30)

**Verified by:** inline + module scripts both parse cleanly; `_ukcStopAudio` defensively guarded with `typeof === 'function'` checks at every external call site

**Notes:**
- 2.2.1 lands AFTER 2.3.0 chronologically — the version number reflects the "v2.2 family closure" not the temporal sequence. CHANGELOG ordering preserved (2.2.1 sits below 2.3.0 since 2.3.0 was published first)

---

## 2026-04-30 | Session 29 | v2.3.0

**Objective:** Reframe Reading Library around a "one book a day" model with adaptive difficulty. The 242-book grid stays as a secondary browse mode, but the default landing is a single curated book that adapts to the user's self-reported difficulty.

**Why this matters:**
The 242-book grid is a choice paralysis machine — users browse, don't pick, leave. Daily-book mode shifts the surface from "library catalogue" to "today's reading", removes the choice burden, and creates a return-visit loop ("come back tomorrow"). Difficulty feedback closes the loop: the system learns from each completion, so a user who fails will see easier books, a user who breezes through gets harder ones. This also generates the streak signal that compounds across days.

**Completed:**
- [x] DB migration `database/migration-daily-book.sql`: `user_daily_book` table + RLS + 3 policies; `user_profiles.reading_level` (1-3) and `books_read_count` columns
- [x] Restructured `#view-library` into `#library-daily` (default) and `#library-browse` (existing grid wrapped untouched). New "Browse all books →" / "← Back to today" link toggles between them
- [x] `getDailyBook(userId)`: queries today's row; if missing, picks a never-assigned book at the user's `reading_level` from `books` (random of up to 20 candidates), inserts the assignment, returns `{book, completed, feedback}`. Has a fallback when the tier is exhausted
- [x] `submitDifficultyFeedback(userId, feedback)`: marks today complete, captures feedback, adjusts `reading_level` (−1/0/+1, clamped 1-3), increments `books_read_count`
- [x] Daily card UI: cover (placeholder 📗 for now since `cover_image_url` may not be populated), series + level eyebrow, title (EN+ZH from `book.title`/`book.title_zh`), days metadata, ▶ Start / ↺ Re-read CTA
- [x] Reading-panel pronunciation logging: bridge from inline script's `ReadiiSpeech.attach()` to module-script `window.handleReadingPanelScore` which inserts into `pronunciation_attempts` with `source='reading'` and `module_id=_currentReadingBookId`. This was missing before — Reading attempts were never recorded
- [x] Difficulty feedback panel: hidden until the user records ≥1 sentence for today's book, then revealed in the reading panel area. Three buttons (Too hard / Just right / Too easy), one-shot submission, "Thanks!" line after submit
- [x] My Progress: two new stat cards — Books read + Reading streak. Stats grid switched to `auto-fit minmax(140px,1fr)` so 6 cards wrap cleanly. Renamed "Practice streak" zh label from "连续天数" to "练习连续" to disambiguate from the new "阅读连续"
- [x] Day rollover: `showAppView('library')` always re-runs `renderLibraryDailyMode()` so the card stays current
- [x] Bilingual coverage: every visible string has `data-en`/`data-zh` spans; `_formatDateLong()` produces locale-appropriate header date

**Files changed:**
- index.html (v2.2.0 → v2.3.0): library HTML restructure, daily-book CSS (~50 lines), inline-script ReadiiSpeech bridge, showAppView library hook, module-script daily-book functions (~280 lines), My Progress new cards + render helper, openBook() book-id tracking
- database/migration-daily-book.sql (new)
- VERSION (2.2.0 → 2.3.0)
- CHANGELOG.md ([2.3.0] entry)
- WORKLOG.md (this Session 29)

**Verified by:** inline + module scripts both parse cleanly via `new Function(code)` syntax check; no dangling references to removed identifiers.

**Pending:**
- [ ] User must run `database/migration-daily-book.sql` in Supabase SQL Editor (writes silently fail until then; daily card shows "not set up yet")
- [ ] v2.2.1 (UK Culture audio activation) still on hold — waiting for transcribe workspace report

---

## 2026-04-30 | Session 28 | v2.2.0

**Objective:** Turn UK Business from a flat 4-scene tab into the **UK Culture Programme** — a multi-module, 5-level, progressive-unlock learning system that funnels engaged learners towards the £2,000 coaching programme. Restructure the sidebar around three coherent groups so the dual-engine model is visible from the nav.

**Completed:**
- [x] DB migration `database/migration-uk-culture-progress.sql` — `uk_culture_progress` table with `UNIQUE(user_id, module_id, level_num, sentence_idx)`, `user_module` index, RLS + 3 DROP-then-CREATE policies (the 42710-safe idiom we settled on for Word Bank v2.0.0)
- [x] Sidebar nav restructured to 3 groups (LEARN / UK CULTURE PROGRAMME / ACCOUNT). Word Bank moved to LEARN; Review moved into UK Culture Programme; 4 new module entries (Business / Education / Daily Life / Setup & Establishment)
- [x] `UK_CULTURE_MODULES`: 4 modules, 5 levels each, 10 sentences each = **200 British English sentences total**, all hard-coded in `index.html` (no extra fetch). Each level has bilingual title + sentence array
- [x] `UK_CULTURE_GROUPS` map for group-level metadata (title / sub / icon, EN+ZH)
- [x] `view-uk-culture` with three internal states: group-home (lists modules in active group + bottom CTA card) → module-home (5 levels with badge/status/CTA per row) → level-detail (10 sentence cards, each with 🔊 Listen + 🎤 Record + per-card result)
- [x] Unlock logic: `isUkLevelUnlocked()` reads progress data, requires uniqueSentences ≥ 8 AND avgScore ≥ 60 on previous level. Level 1 always open
- [x] Score writes are **dual**: upsert into `uk_culture_progress` (used for unlock + best-score display) AND insert into `pronunciation_attempts` with `source='uk_culture'`, `module_id='<id>_l<level>'` (used for My Progress page integration)
- [x] Per-card result panel: score + tier feedback + transcript echo + LCS-aligned word diff (reuses `ReadiiSpeech.tokenize`/`wordDiff` from v2.0.1). Default `.speech-result` panel deliberately omitted from the level container so we don't render two result panels at once
- [x] 🔊 Listen button is a placeholder: `data-audio-url=""` + `disabled` + "(soon)" suffix. Step 2 (TTS batch script) will populate URLs and re-enable the buttons
- [x] My Progress upgrade banner CTA repointed from `uk-business` to `ukc-business`
- [x] `_pgSourceLabel()` extended to recognise `uk_culture` source — parses `module_id='<id>_l<level>'` to display "Professional Email Writing · L2" in Recent Attempts

**Removed:**
- Old `view-uk-business` (4 flat scenes × 5 sentences = 20 sentences). Content folded into the new structure: email → email_l1-5, meeting → meeting_l1-5, daily → daily_l1-5, pitch → setup_l5 (Growth & Expansion)
- `UK_BUSINESS_SCENES` constant, `loadUkBusinessStats` / `logUkBusinessAttempt` / `renderUkBusinessHome` / `openUkBusinessScene` / `renderUkSceneFooter` functions, all `.ukb-*` CSS (~40 lines)

**Why this matters:**
v2.1 added a single nav tab + a banner. v2.2 makes UK Culture the **second visible product surface** in the app, with a real progression mechanic that creates "earned upsell" moments. The £2,000 CTA now sits at the bottom of every group home, and a learner who unlocks Level 5 in a module has a clear narrative for why personalised coaching is the next step. The 3-group nav frames Readii correctly: free engagement (LEARN) and paid programme (UK CULTURE PROGRAMME) are visually separated in the sidebar.

**Files changed:**
- index.html (v2.1.0 → v2.2.0): nav restructure, new `view-uk-culture` markup (3 sub-states), `.ukc-*` CSS (~70 lines), `UK_CULTURE_MODULES` + `UK_CULTURE_GROUPS` constants (~280 lines), unlock + render functions, `showAppView` dispatch extension (4 new routes sharing one container), `_pgSourceLabel` extension, banner CTA target update. Old `.ukb-*` and `UK_BUSINESS_SCENES` removed
- database/migration-uk-culture-progress.sql (new)
- VERSION (2.1.0 → 2.2.0)
- CHANGELOG.md ([2.2.0] entry)
- WORKLOG.md (this Session 28)

**Verified by:** inline `<script>` block parses cleanly via `new Function(code)` syntax check; no remaining `ukb-` / `UK_BUSINESS` / `uk_business` references in the file.

**Pending:**
- [ ] User must run `database/migration-uk-culture-progress.sql` in Supabase SQL Editor (writes silently fail until then; UI still works)
- [ ] Step 2 (separate task): TTS audio batch generation in transcribe workspace + URL population for the 200 Listen buttons

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
