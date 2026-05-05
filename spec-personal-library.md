# Personal Library — Engineering Specification

**Status:** Ready for build · v1.0
**Owner:** Xiaoyu (Readii)
**Target:** Adults & international students. New revenue line on top of LEARN.
**Build mode:** Self-contained spec. Claude Code reads this and builds end-to-end.

---

## 0. TL;DR

A new feature inside LEARN that lets a user upload any English PDF and turn it into a personalised audiobook + daily reading plan + pronunciation practice. User pays per book (£8/£18/£30/£45 tiers). Completing a book earns a voucher (10–20% of book price) usable on the next book. Audio synthesised by **Azure Neural TTS (Sonia default, Ryan male)**. Vocabulary + representative sentences picked by **OpenAI gpt-4o-mini**. Pronunciation evaluation reuses the **existing Web Speech API engine** (the same one powering AI Voice Coach + Word Bank + UK Culture).

This feature plugs into the existing Supabase + frontend stack. **One new background worker** is required (Node.js, hosted on Render or Railway) because Supabase Edge Functions cannot run a 1-hour TTS pipeline within their 150s timeout.

---

## 1. User Flow (End-to-End)

1. User clicks **"Personal Library"** in LEARN nav (new menu item, sits next to Reading Library).
2. Lands on `/learn/personal-library`. Sees their existing books (if any) + big **"Upload a Book"** CTA.
3. Click upload → `/learn/personal-library/upload`.
4. Drag-drop or pick a PDF. Client uploads to Supabase Storage (`user-pdfs/{user_id}/{book_id}/source.pdf`).
5. Server parses PDF → returns: title, author (if in metadata), page count, word count, language detection, scan-vs-text detection.
6. **If parse fails / scanned / non-English** → friendly rejection screen with reason. PDF auto-deleted in 24h.
7. **If parse OK** → Customisation panel:
   - Daily commitment slider: **5 / 10 / 15 / 20 / 30 minutes per day** (default 15)
   - Voice picker (4 cards, each with 30s preview):
     - Sonia (default, en-GB female, RP) — included
     - Ryan (en-GB male) — included
     - Sonia HD (Premium) — +50%
     - Ryan HD (Premium) — +50%
   - Voucher field (if user has active voucher)
8. Live price quote updates as user changes settings.
9. Click **"Continue to checkout"** → Stripe Checkout (hosted).
10. Stripe success webhook hits backend → mark book as `paid` → enqueue processing job.
11. User redirected to `/learn/personal-library/{book_id}` showing **"Preparing your book — this typically takes 5–15 minutes. We'll email you when ready."**
12. Background worker: extract text → chunk by daily minutes → per chunk (parallel): generate Azure TTS audio + LLM vocab + LLM representative sentences → upload audio → write rows.
13. When all chunks ready: mark book `ready`, send email via Resend.
14. User opens `/learn/personal-library/{book_id}/day/1`:
    - Header: "Day 1 of 26 · pp. 1–8 · ~14 min"
    - Text panel (clean reader, scrollable)
    - Audio player (▶ Sonia, 0.75x–1.5x speed, scrub bar, autosave position)
    - Vocabulary side panel (collapsible, 8–12 words with IPA + 中文 + example)
    - Pronunciation practice block: 5–8 representative sentences (each: 🔊 listen + 🎤 record + score)
    - **"Mark day complete"** button (enabled after audio ≥80% played AND ≥3 sentences recorded)
15. Day complete → streak ticks, next day unlocks.
16. **All days complete (within 90 days of `paid_at`)** → completion screen → voucher issued:
    - 80–99% chunks complete: 10% voucher
    - 100% complete: 20% voucher
17. Voucher visible in "Personal Library" → "My Vouchers" section, code copy-able, applied at next checkout via voucher field.

---

## 2. Architecture

```
┌─────────────────────┐
│ Frontend (existing) │  /learn/personal-library/*
└──────────┬──────────┘
           │
   ┌───────┴────────┐
   ▼                ▼
┌─────────┐   ┌──────────────┐
│ Supabase│   │  Stripe      │
│  Edge   │◄──│  Checkout    │
│  Funcs  │   │  + Webhook   │
└────┬────┘   └──────────────┘
     │
     ▼
┌──────────────────────────┐
│ Supabase Postgres + RLS  │
│  + book_processing_jobs  │◄────────┐
└──────────────────────────┘         │
                                     │ polls every 5s
┌────────────────────────────────────┴──────┐
│ NEW: Node.js worker (Render/Railway)      │
│  - PDF parse (pdf-parse)                  │
│  - Chunking by reading time               │
│  - Azure TTS synthesis (per chunk)        │
│  - OpenAI vocab + sentence selection      │
│  - Storage uploads                        │
│  - Resend email on completion             │
└───────────────────────────────────────────┘
```

**Edge Function responsibilities (synchronous, fast):**
- `book-quote` — receive PDF metadata, return parse result + price
- `book-checkout` — create Stripe Checkout Session
- `stripe-webhook` — handle payment confirmation, enqueue job
- `book-fetch-day` — return chunk + signed audio URL
- `book-mark-complete` — mark day done, check book completion, issue voucher
- `book-pronunciation-attempt` — record an attempt (writes to existing `pronunciation_attempts` with new source_type)

**Worker responsibilities (asynchronous, slow):**
- Long-running PDF processing pipeline
- Per-chunk TTS + LLM calls
- Auto-refund on processing failure (≥1h timeout)

---

## 3. Database Schema

All tables go in `public` schema. Apply RLS to every new table — pattern: user can only see/modify their own rows. Service role bypasses RLS for the worker.

### 3.1 New tables

```sql
-- ─────────────────────────────────────────────────────
-- user_books: master record per user-uploaded book
-- ─────────────────────────────────────────────────────
create table public.user_books (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  title                    text not null,
  author                   text,
  source_pdf_path          text not null,
  total_pages              int not null,
  total_words              int not null,
  estimated_audio_seconds  int not null,
  language_detected        text default 'en',
  voice_id                 text not null check (voice_id in ('sonia','ryan','sonia-hd','ryan-hd')),
  daily_minutes            int not null check (daily_minutes in (5,10,15,20,30)),
  total_days               int not null,
  tier                     text not null check (tier in ('short','medium','long','xlarge')),
  base_price_pence         int not null,
  voice_premium_pence      int not null default 0,
  voucher_id               uuid references public.user_book_vouchers(id),
  voucher_discount_pence   int not null default 0,
  amount_paid_pence        int not null default 0,
  stripe_session_id        text,
  stripe_payment_intent_id text,
  status                   text not null default 'pending_payment'
                              check (status in ('pending_payment','paid','processing','ready','in_progress','completed','failed','refunded')),
  failure_reason           text,
  created_at               timestamptz not null default now(),
  paid_at                  timestamptz,
  processing_started_at    timestamptz,
  ready_at                 timestamptz,
  first_read_at            timestamptz,
  last_read_at             timestamptz,
  completed_at             timestamptz
);

create index user_books_user_id_idx on public.user_books(user_id);
create index user_books_status_idx on public.user_books(status);

alter table public.user_books enable row level security;

create policy "users see own books"
  on public.user_books for select
  using (auth.uid() = user_id);

create policy "users insert own books"
  on public.user_books for insert
  with check (auth.uid() = user_id);

create policy "users update own books status fields"
  on public.user_books for update
  using (auth.uid() = user_id);
-- (Worker uses service role and bypasses RLS for internal status writes.)


-- ─────────────────────────────────────────────────────
-- user_book_chunks: per-day reading task
-- ─────────────────────────────────────────────────────
create table public.user_book_chunks (
  id                        uuid primary key default gen_random_uuid(),
  book_id                   uuid not null references public.user_books(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  day_number                int not null,
  start_page                int not null,
  end_page                  int not null,
  start_char_offset         int not null,
  end_char_offset           int not null,
  word_count                int not null,
  estimated_seconds         int not null,
  text_content              text not null,
  audio_path                text,
  audio_duration_seconds    int,
  vocabulary                jsonb,    -- [{word, ipa, chinese, example_sentence, position}]
  representative_sentences  jsonb,    -- [{sentence, position, target_phonemes:[]}]
  status                    text not null default 'pending'
                              check (status in ('pending','generating','ready','failed')),
  audio_progress_seconds    int default 0,
  read_at                   timestamptz,
  created_at                timestamptz not null default now(),
  unique (book_id, day_number)
);

create index user_book_chunks_book_idx on public.user_book_chunks(book_id);
create index user_book_chunks_user_idx on public.user_book_chunks(user_id);

alter table public.user_book_chunks enable row level security;

create policy "users see own chunks"
  on public.user_book_chunks for select using (auth.uid() = user_id);
create policy "users update own chunks progress"
  on public.user_book_chunks for update using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────
-- user_book_vouchers: completion rewards
-- ─────────────────────────────────────────────────────
create table public.user_book_vouchers (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  code                  text not null unique,                -- e.g. 'READ-A4F2-9KM3'
  amount_pence          int not null,
  earned_from_book_id   uuid references public.user_books(id),
  earned_from_completion_pct  int not null,                  -- 80 or 100 typically
  earned_at             timestamptz not null default now(),
  expires_at            timestamptz not null,
  applied_to_book_id    uuid references public.user_books(id),
  applied_at            timestamptz,
  status                text not null default 'active'
                          check (status in ('active','applied','expired'))
);

create index user_book_vouchers_user_idx on public.user_book_vouchers(user_id);
create index user_book_vouchers_status_idx on public.user_book_vouchers(status);

alter table public.user_book_vouchers enable row level security;

create policy "users see own vouchers" on public.user_book_vouchers
  for select using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────
-- book_processing_jobs: worker queue
-- ─────────────────────────────────────────────────────
create table public.book_processing_jobs (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.user_books(id) on delete cascade,
  status          text not null default 'queued'
                    check (status in ('queued','running','succeeded','failed')),
  attempts        int not null default 0,
  last_error      text,
  enqueued_at     timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz
);

create index book_processing_jobs_status_idx on public.book_processing_jobs(status, enqueued_at);

alter table public.book_processing_jobs enable row level security;
-- no user-facing policies; only service role accesses this table.
```

### 3.2 Extend existing `pronunciation_attempts`

Add three columns so Personal Library shares the existing scoring infrastructure with Voice Coach / Word Bank / UK Culture. **Backward-compatible — nullable defaults.**

```sql
alter table public.pronunciation_attempts
  add column if not exists source_type text default 'voice_coach'
    check (source_type in ('voice_coach','word_bank','uk_culture','personal_library')),
  add column if not exists source_id uuid,
  add column if not exists source_metadata jsonb;

create index if not exists pronunciation_attempts_source_idx
  on public.pronunciation_attempts(user_id, source_type, source_id);
```

For Personal Library entries: `source_type='personal_library'`, `source_id=chunk_id`, `source_metadata={day_number, sentence_index, sentence_text}`.

This means **My Progress dashboard automatically picks up Personal Library scores with zero changes.** ✅

---

## 4. Storage Buckets

Three new private buckets in Supabase Storage:

| Bucket | Path pattern | Notes |
|---|---|---|
| `user-pdfs` | `{user_id}/{book_id}/source.pdf` | Auto-delete unpaid uploads after 24h via cron |
| `user-book-audio` | `{user_id}/{book_id}/day-{N}.mp3` | Generated MP3 per chunk |
| `user-book-recordings` | `{user_id}/{book_id}/day-{N}/sentence-{idx}.webm` | User pronunciation recordings |

All access via signed URLs (60s TTL) — never public. Bucket policies: only the user can list/read their own prefix; worker uses service role for writes.

---

## 5. Pricing & Voucher Logic

### 5.1 Pricing function

```typescript
function priceBook(estimatedAudioSeconds: number, voiceId: VoiceId): {
  tier: Tier;
  basePencePence: number;
  voicePremiumPence: number;
  totalPence: number;
} {
  // Tier from audio duration
  const tier =
    estimatedAudioSeconds < 1800        ? 'short'   :  // < 30 min
    estimatedAudioSeconds < 9000        ? 'medium'  :  // 30 min – 2.5 h
    estimatedAudioSeconds < 18000       ? 'long'    :  // 2.5 h – 5 h
                                          'xlarge';   // 5 h+

  const basePence = { short: 800, medium: 1800, long: 3000, xlarge: 4500 }[tier];

  const isHd = voiceId.endsWith('-hd');
  const voicePremium = isHd ? Math.round(basePence * 0.5) : 0;

  return {
    tier,
    basePencePence: basePence,
    voicePremiumPence: voicePremium,
    totalPence: basePence + voicePremium,
  };
}
```

### 5.2 Voucher rules

- **Issuance:** at book completion, evaluated from `user_book_chunks` rows with `read_at IS NOT NULL`:
  - completion_pct ≥ 100 → voucher = round(20% × `amount_paid_pence`)
  - completion_pct in [80, 100) → voucher = round(10% × `amount_paid_pence`)
  - completion_pct < 80 → no voucher
- **Window:** book must be completed within 90 days of `paid_at`. Beyond 90 days, no voucher (status stays `in_progress`, but completion flag closed).
- **Expiry:** voucher `expires_at = earned_at + interval '60 days'`.
- **Application:** at most 1 voucher per checkout. Cannot be applied to the book that earned it. Cannot stack.
- **Code format:** `READ-XXXX-XXXX` where X = uppercase alphanumeric, generated via `crypto.randomUUID()` + base32 truncation.

### 5.3 Reading speed assumption

`words_per_minute = 130` (chosen for ESL adults — slightly slower than native pace, gives breathing room for shadowing). This is the constant used for: (a) PDF estimated audio duration, (b) chunking by daily minutes.

Configurable via env var `READING_WPM` for future tuning.

---

## 6. External Services & Environment

### 6.1 New env vars

```bash
# Azure Speech
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=uksouth        # use a UK region for latency + sovereignty optics

# OpenAI (likely already exists — reuse)
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=https://readii.co.uk/learn/personal-library/checkout/success?book_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://readii.co.uk/learn/personal-library/upload?cancelled=1

# Resend (or whatever email is used today)
RESEND_API_KEY=
RESEND_FROM=Readii <hello@readii.co.uk>

# Tuning
READING_WPM=130
MAX_PDF_BYTES=52428800            # 50 MB
MAX_PDF_PAGES=800
PROCESSING_TIMEOUT_MINUTES=60
UNPAID_PDF_TTL_HOURS=24

# Worker
WORKER_POLL_INTERVAL_MS=5000
SUPABASE_SERVICE_ROLE_KEY=         # worker only
SUPABASE_URL=
```

### 6.2 Azure TTS voice mapping

| voice_id | Azure voice | SSML notes |
|---|---|---|
| `sonia` | `en-GB-SoniaNeural` | Standard Neural, RP British female, BBC-ish |
| `ryan` | `en-GB-RyanNeural` | Standard Neural, RP British male |
| `sonia-hd` | `en-GB-SoniaMultilingualNeural` (HD) | More natural, premium pricing |
| `ryan-hd` | `en-GB-RyanMultilingualNeural` (HD) | More natural, premium pricing |

SSML wrap: use `<prosody rate="0%">` (default) — frontend handles speed via HTML5 audio playback rate. Add `<break time="500ms"/>` between paragraphs for natural rhythm.

### 6.3 OpenAI usage

Single model: **`gpt-4o-mini`** (cheap, fast, fine for vocab and sentence selection).

Two prompts per chunk, run in parallel:

**Prompt A — vocabulary extraction**
```
You are an English vocabulary curator for advanced ESL learners (CEFR B2+).

From the text below, pick 8–12 words that are:
- CEFR B2 or above
- Useful for general literacy (avoid overly archaic, dialectal, or proper nouns)
- Distinct from each other (no two with the same root)

For each, return: word | IPA (British) | concise Chinese gloss | the original sentence it appeared in.

Output strict JSON: {"words":[{"word":"","ipa":"","chinese":"","example":""}]}

TEXT:
<<<chunk text>>>
```

**Prompt B — representative sentence selection**
```
You are a British English pronunciation coach.

From the text below, pick 5–8 sentences that are best for shadowing practice:
- Length 6–18 words
- Combine multiple British-English-distinctive phonemes (broad /ɑː/, non-rhotic /r/, /əʊ/, yod /j/, /ɒ/, TH)
- Mix declarative, question, and emphatic forms if available
- Avoid sentences with proper nouns longer than 1 word

For each, return: sentence | the phonemes it primarily showcases (array).

Output strict JSON: {"sentences":[{"sentence":"","target_phonemes":["broad_a","yod"]}]}

TEXT:
<<<chunk text>>>
```

Cost estimate per chunk: ~$0.001 (input) + ~$0.002 (output) = **~$0.003 per chunk**. A 26-day book = ~$0.08 total LLM cost.

---

## 7. Backend Endpoints (Edge Functions)

All under `/functions/v1/`. Auth via Supabase JWT in `Authorization: Bearer ...` header. Validation of inputs is mandatory — return 400 with structured error `{error: {code, message}}`.

### 7.1 `POST /functions/v1/personal-library-quote`

**Request** (multipart/form-data)
- `pdf` (file, ≤50 MB)

**Response 200**
```json
{
  "book_id": "uuid",
  "title": "Pride and Prejudice",
  "author": "Jane Austen",
  "total_pages": 287,
  "total_words": 78421,
  "estimated_audio_seconds": 36192,
  "language_detected": "en",
  "is_scanned": false,
  "available_voices": [
    {"id": "sonia",    "label": "Sonia",    "premium": false, "preview_url": "https://.../sonia-30s.mp3"},
    {"id": "ryan",     "label": "Ryan",     "premium": false, "preview_url": "https://.../ryan-30s.mp3"},
    {"id": "sonia-hd", "label": "Sonia HD", "premium": true,  "preview_url": "https://.../sonia-hd-30s.mp3"},
    {"id": "ryan-hd",  "label": "Ryan HD",  "premium": true,  "preview_url": "https://.../ryan-hd-30s.mp3"}
  ],
  "daily_minute_options": [5,10,15,20,30],
  "pricing_preview": {
    "by_voice": {
      "sonia":    {"tier":"xlarge","total_pence":4500},
      "ryan":     {"tier":"xlarge","total_pence":4500},
      "sonia-hd": {"tier":"xlarge","total_pence":6750},
      "ryan-hd":  {"tier":"xlarge","total_pence":6750}
    }
  }
}
```

**Errors**
- 400 `{code:"PDF_TOO_LARGE"}`
- 400 `{code:"PDF_TOO_MANY_PAGES"}`
- 400 `{code:"PDF_SCANNED"}` — fallback message: "This appears to be a scanned PDF. We don't yet support OCR — please try a text-based PDF."
- 400 `{code:"PDF_NOT_ENGLISH"}` — "Personal Library currently supports English-language books only."
- 400 `{code:"PDF_PARSE_FAILED"}`

**Side effect:** creates `user_books` row with `status='pending_payment'`, `daily_minutes` and `voice_id` not yet set.

### 7.2 `POST /functions/v1/personal-library-checkout`

**Request**
```json
{
  "book_id": "uuid",
  "voice_id": "sonia",
  "daily_minutes": 15,
  "voucher_code": "READ-A4F2-9KM3"   // optional
}
```

**Response 200**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "expires_at": "2026-05-04T16:00:00Z",
  "summary": {
    "base_price_pence": 4500,
    "voice_premium_pence": 0,
    "voucher_discount_pence": 360,
    "total_pence": 4140
  }
}
```

**Logic:**
1. Validate book belongs to user, status is `pending_payment`.
2. Compute total_days = ceil(total_words / (daily_minutes × 130)).
3. Compute price (see pricing function).
4. If voucher_code: validate it (active, owned by user, not expired, not from this book) → reserve it (mark `applied_to_book_id` provisionally; release on cancel).
5. Update `user_books` row with all selections.
6. Create Stripe Checkout Session with `mode='payment'`, line item with computed total.
7. Return URL.

### 7.3 `POST /functions/v1/personal-library-stripe-webhook`

Standard Stripe webhook handler. Verify signature with `STRIPE_WEBHOOK_SECRET`.

Events handled:
- `checkout.session.completed` → mark book `paid`, store `payment_intent_id`, enqueue `book_processing_jobs` row, mark voucher `applied`.
- `checkout.session.expired` / `payment_intent.canceled` → release voucher (back to `active`), book stays `pending_payment` (user can retry).
- `charge.refunded` → mark book `refunded`, voucher logic reversed.

### 7.4 `GET /functions/v1/personal-library-book/:bookId`

Returns book metadata + summary + day list (just numbers + status, not text content).

### 7.5 `GET /functions/v1/personal-library-day/:bookId/:dayNumber`

Returns the chunk row with audio_path resolved to a 60-second signed URL. Updates `user_books.last_read_at = now()`. If first read on this book, also sets `first_read_at`.

### 7.6 `POST /functions/v1/personal-library-mark-day`

```json
{ "book_id": "uuid", "day_number": 3, "audio_progress_seconds": 845 }
```

Sets `user_book_chunks.read_at = now()`. Then evaluates book completion:
- If all days read → mark book `completed`, set `completed_at`, issue 20% voucher.
- Else if ≥80% read AND `paid_at + 90 days < now()` → mark book `completed`, issue 10% voucher.
- Updates `user_books.status = 'in_progress'` if not already.

### 7.7 `POST /functions/v1/personal-library-recording`

Accepts user audio recording + transcript from Web Speech API. Reuses scoring engine.

```json
{
  "book_id": "uuid",
  "day_number": 3,
  "sentence_index": 2,
  "transcript": "what the recogniser heard",
  "expected": "the original sentence"
}
```

Internally calls the existing scoring helper (LCS word diff → accuracy_score 0–100) and writes to `pronunciation_attempts` with `source_type='personal_library'`. Returns `{ accuracy_score, word_diff }`.

---

## 8. Background Worker (Node.js)

**Hosting:** Render Background Worker or Railway service. Single instance is fine for v1; scale horizontally later by adding a row-level lock (`SELECT ... FOR UPDATE SKIP LOCKED`).

**Runtime:** Node 20+, TypeScript.

**Dependencies:**
- `@supabase/supabase-js` (service role)
- `pdf-parse` (text extraction)
- `franc` (language detection)
- `microsoft-cognitiveservices-speech-sdk` (Azure TTS)
- `openai` (vocab + sentence selection)
- `resend` (completion email)

**Loop pseudocode:**

```typescript
while (true) {
  const job = await claimNextJob();      // FOR UPDATE SKIP LOCKED
  if (!job) { await sleep(5000); continue; }

  try {
    await processBook(job.book_id);
    await markJobSucceeded(job.id);
  } catch (err) {
    await recordError(job.id, err);
    if (job.attempts >= 3) {
      await refundBookAndNotify(job.book_id, err);
      await markJobFailed(job.id);
    } else {
      await requeue(job.id);             // exponential backoff
    }
  }
}

async function processBook(bookId: string) {
  const book = await loadBook(bookId);
  await setStatus(bookId, 'processing', { processing_started_at: new Date() });

  // 1. Download PDF from Storage
  const pdfBuffer = await downloadFromStorage(book.source_pdf_path);

  // 2. Extract text per page
  const pages = await extractPdfText(pdfBuffer);   // [{pageNum, text}]

  // 3. Chunk by daily minutes
  const chunks = chunkByReadingTime(pages, book.daily_minutes, READING_WPM);
  // chunks: [{day_number, start_page, end_page, text, word_count, estimated_seconds}]

  // 4. Insert chunk rows in 'pending'
  await insertChunks(bookId, chunks);

  // 5. For each chunk, in parallel (concurrency limit 3):
  await pMap(chunks, async (chunk) => {
    await setChunkStatus(chunk.id, 'generating');
    const [audioBuffer, vocab, sentences] = await Promise.all([
      synthesiseAzure(chunk.text, book.voice_id),
      llmExtractVocab(chunk.text),
      llmPickSentences(chunk.text),
    ]);
    const audioPath = await uploadAudio(book.user_id, bookId, chunk.day_number, audioBuffer);
    await setChunkReady(chunk.id, { audioPath, vocab, sentences, audio_duration_seconds: estimateMp3Duration(audioBuffer) });
  }, { concurrency: 3 });

  // 6. Mark book ready
  await setStatus(bookId, 'ready', { ready_at: new Date() });

  // 7. Send email
  await sendReadyEmail(book.user_id, book.title);
}
```

**Chunking algorithm:**

```typescript
function chunkByReadingTime(
  pages: Array<{pageNum: number, text: string}>,
  dailyMinutes: number,
  wpm: number
): Chunk[] {
  const targetWords = dailyMinutes * wpm;
  // Walk text sentence-by-sentence (split on /[.!?]+\s+/), accumulate until >= targetWords,
  // then close chunk on the NEXT sentence boundary. Track page numbers as we go.
  // Never break mid-sentence. Final chunk takes the remainder regardless of size.
  // Return array of { day_number, start_page, end_page, start_char_offset, end_char_offset,
  //                  text_content, word_count, estimated_seconds }
  // estimated_seconds = (word_count / wpm) * 60
}
```

**Auto-refund condition:** if `processing_started_at + 60 minutes < now()` and book still in `processing` → trigger Stripe refund via API, mark book `refunded`, mark voucher (if any) back to `active`, send apology email.

---

## 9. Frontend

### 9.1 New routes

```
/learn/personal-library                                   (list)
/learn/personal-library/upload                            (upload + customise + quote)
/learn/personal-library/checkout/success                  (Stripe redirect)
/learn/personal-library/checkout/cancel                   (Stripe redirect)
/learn/personal-library/{bookId}                          (book overview, day list)
/learn/personal-library/{bookId}/day/{dayNumber}          (daily reading screen)
/learn/personal-library/vouchers                          (active + applied voucher list)
```

### 9.2 Navigation change

Add **"Personal Library"** under LEARN, between "Reading Library" and "AI Voice Coach". Use 📚➕ icon or similar (match existing icon style — likely Lucide icons).

### 9.3 Component inventory (new components)

```
components/personal-library/
├── BookList.tsx                  // grid of user's books with status badges
├── BookCard.tsx                  // single book tile
├── PdfDropzone.tsx               // upload UI w/ progress bar
├── BookQuotePanel.tsx            // shows parse stats + voice picker + slider
├── VoicePickerCard.tsx           // single voice card with preview audio
├── DailyMinutesSlider.tsx        // 5/10/15/20/30 stepped slider
├── PriceQuoteBox.tsx             // live-updating price display
├── VoucherInput.tsx              // code entry + validation
├── BookOverview.tsx              // status, progress %, day grid
├── DayChip.tsx                   // single day cell (locked / pending / done)
├── DailyReadingScreen.tsx        // the workhorse screen
│   ├── TextReader.tsx            // clean reader, word-level highlight on audio sync (optional v1.1)
│   ├── AudioPlayer.tsx           // ▶ / scrub / 0.75–1.5x speed / autosave position
│   ├── VocabularyDrawer.tsx      // collapsible side panel
│   └── SentencePracticeBlock.tsx // listen + record + score; reuses existing scoring component
├── CompletionScreen.tsx          // celebration + voucher reveal
└── VoucherList.tsx               // active vouchers with copy-code button
```

### 9.4 Existing components to reuse (don't duplicate)

- The pronunciation scoring component from AI Voice Coach (SVG ring + LCS diff). Personal Library's `SentencePracticeBlock` consumes it.
- The streak indicator from My Progress.
- The bilingual EN/中文 toggle wrapper — all new copy must support data-en / data-zh per existing pattern.

### 9.5 User-facing copy (bilingual, both required)

Examples — full strings list will be in `i18n/personal-library.ts`:

| Key | EN | 中文 |
|---|---|---|
| nav.personal_library | Personal Library | 个人书库 |
| upload.cta | Upload your book | 上传你的书 |
| upload.dropzone | Drop a PDF here, or click to browse | 把 PDF 拖进来，或点击选择 |
| upload.parsing | Analysing your book… | 正在分析你的书…… |
| quote.daily_commitment | How much time per day? | 每天打算读多久？ |
| quote.voice_picker | Pick your reading voice | 选一个朗读声音 |
| quote.price_value_line | {hours}h {mins}m of professional British audio · {days} days of guided practice · pronunciation scoring on {sentenceCount}+ sentences | {hours}小时{mins}分钟的专业英式朗读音频 · {days}天引导练习 · 对 {sentenceCount}+ 个句子进行发音评分 |
| quote.continue | Continue to checkout — £{price} | 继续支付 — £{price} |
| processing.banner | Preparing your book — typically 5–15 minutes. We'll email you when ready. | 正在准备你的书——通常需要 5–15 分钟。完成后会邮件通知你。 |
| day.header | Day {n} of {total} · pp. {start}–{end} · ~{minutes} min | 第 {n} 天 / 共 {total} 天 · 第 {start}–{end} 页 · 约 {minutes} 分钟 |
| day.mark_complete | Mark day complete | 标记今日完成 |
| day.complete_locked | Listen to ≥80% and record ≥3 sentences to mark complete | 听完 80% 并录制至少 3 句后即可标记 |
| completion.title | You finished {title}! | 你读完了《{title}》！ |
| completion.voucher_reveal | You've earned a £{amount} voucher for your next book. Code: {code}. Expires {date}. | 获得了 £{amount} 代金券，可用于下一本书。代码：{code}。{date} 前有效。 |

---

## 10. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| PDF >50 MB | Reject before upload starts (client-side size check + server validation) |
| PDF >800 pages | Reject with "This book is unusually long. Please contact support." |
| Scanned PDF (avg <50 chars/page) | Reject with friendly message; keep PDF 24h in case OCR is added |
| Non-English (franc detects ≠ `eng`) | Reject with "English-only for now" |
| DRM-protected PDF | `pdf-parse` throws → catch and return `PDF_PARSE_FAILED` |
| User abandons before payment | After 24h, cron deletes `source.pdf` and the `user_books` row |
| Stripe checkout abandoned | Voucher released; book stays `pending_payment`; user can retry from `/upload` (re-uses existing book record) |
| Worker timeout (>60min) | Auto-refund via Stripe API, book → `refunded`, voucher restored, apology email |
| Azure TTS fails for one chunk | Retry 3x with exponential backoff. If still fails, fail the entire book and refund. |
| Voucher applied but checkout cancelled | Mark voucher back to `active` |
| Voucher used on wrong book | Validation in checkout endpoint refuses |
| User uploads same book twice | Allowed — they're paying twice; no dedup |
| Multiple recordings for same sentence | All stored, `pronunciation_attempts` keeps history; latest score shown in UI |
| User exceeds 5 books in 30 days | Soft warning, but allowed (don't gate; sanity check only) |
| PDF parse times out (>60s) | Reject `PDF_PARSE_FAILED`; don't keep partial state |

---

## 11. Acceptance Criteria

A user with no prior books can:

- [ ] Upload a 100-page English text-based PDF and see correct page/word counts within 30 seconds
- [ ] See a price quote update live as they change voice and daily minutes
- [ ] Apply a valid voucher code and see the discount reflected
- [ ] Complete Stripe payment in test mode and land on the success page
- [ ] Within 15 minutes, see the book status change to "Ready" and receive an email
- [ ] Open Day 1 and see: text content, working audio player with Sonia voice, 8–12 vocabulary words, 5–8 representative sentences
- [ ] Play audio at 0.75x, 1x, 1.25x, 1.5x — speeds work and position autosaves
- [ ] Record a sentence, get an accuracy score, see word-level diff (red for wrong, green for correct)
- [ ] Mark Day 1 complete only after ≥80% audio and ≥3 sentences recorded
- [ ] Streak increments correctly; visible on My Progress dashboard
- [ ] Personal Library scores show up in My Progress alongside Voice Coach scores
- [ ] Completing all days within 90 days issues a 20% voucher
- [ ] Voucher appears in `/personal-library/vouchers` with a copyable code
- [ ] Voucher applies cleanly on a second book purchase
- [ ] Scanned PDF is rejected with a clear message, no charge
- [ ] Non-English PDF is rejected with a clear message, no charge
- [ ] Worker failure on 3rd attempt triggers Stripe refund and apology email

---

## 12. Out of Scope (v1)

Explicitly **not** building these in v1. Document them so they don't get accidentally added:

- OCR for scanned PDFs (rejection message + collect demand signal)
- DOCX / EPUB / TXT input — PDF only
- Word-level audio sync highlighting (nice but adds complexity)
- Offline audio download for mobile
- Sharing books between users / family accounts
- User-selected representative sentences (LLM picks; user can record custom sentences but not curate the auto-list)
- Stripe subscription billing (per-book one-off only)
- Refunds initiated by user from UI (manual via support email for v1)
- Native mobile app integration

---

## 13. Build Order — Claude Code Task List

Build in this order. Each step should be PR-able and testable independently.

### Phase 1 — Schema & Storage (foundations)
1. Create migrations for the four new tables + `pronunciation_attempts` extension
2. Apply RLS policies to all new tables
3. Create the three new Storage buckets with policies
4. Add 24h cleanup cron for unpaid PDFs (Supabase scheduled Edge Function or worker cron)

### Phase 2 — Quote pipeline (no payment yet)
5. Build `personal-library-quote` Edge Function (PDF upload → parse → return stats + price)
6. Build `PdfDropzone` + `BookQuotePanel` + `VoicePickerCard` + `DailyMinutesSlider` + `PriceQuoteBox` components
7. Wire upload → quote screen end-to-end
8. Pre-generate the 4 voice preview MP3s (one short paragraph each) and host in `user-book-audio` public-readable preview folder

### Phase 3 — Stripe checkout
9. Build `personal-library-checkout` Edge Function
10. Build `personal-library-stripe-webhook` Edge Function
11. Add success/cancel pages
12. Test mode end-to-end purchase

### Phase 4 — Worker pipeline
13. Bootstrap Node.js worker repo (separate from main app, or `worker/` folder)
14. Implement PDF text extraction + language detection + scan detection
15. Implement chunking algorithm
16. Implement Azure TTS synthesis
17. Implement OpenAI vocab + sentence selection
18. Implement Storage upload + chunk row writes
19. Implement Resend completion email
20. Deploy worker (Render or Railway), verify polling works
21. Implement auto-refund on timeout

### Phase 5 — Reading experience
22. Build book overview page (`/personal-library/{bookId}`)
23. Build daily reading screen (`/personal-library/{bookId}/day/{n}`)
24. Implement `AudioPlayer` with speed + autosave
25. Implement `VocabularyDrawer`
26. Implement `SentencePracticeBlock` (reuses existing scoring component)
27. Build `personal-library-mark-day` endpoint + completion logic
28. Streak integration with existing streak system

### Phase 6 — Vouchers
29. Voucher issuance on completion (server-side)
30. Voucher list page
31. Voucher application in checkout flow
32. Email notification when voucher earned

### Phase 7 — Polish + edge cases
33. All bilingual copy in place
34. Error states for every endpoint
35. Empty states (no books yet, no vouchers yet)
36. My Progress integration verified — Personal Library scores visible
37. End-to-end QA pass against acceptance criteria

### Phase 8 — Soft launch
38. Internal testing with 3 PDFs of varying sizes
39. Admin tooling: a Supabase view to monitor `book_processing_jobs` queue
40. Open to 10 invited beta users; monitor closely for 1 week before public launch

---

## 14. Costs & Margin (Reference)

For one **medium-tier book** (£18, ~2 hours audio, ~30,000 words, ~26 days):

| Cost item | Amount |
|---|---|
| Azure Sonia TTS (~30k chars × £12/M) | £0.36 |
| OpenAI gpt-4o-mini (vocab + sentences × 26 chunks) | £0.06 |
| Stripe fee (1.4% + 20p UK) | £0.45 |
| Storage + bandwidth (negligible per book) | <£0.05 |
| **Total variable cost** | **~£0.92** |
| **Gross margin** | **£17.08 / £18.00 = 95%** |

For HD voice (Sonia HD), TTS cost roughly doubles to ~£0.72; on £27 (£18 × 1.5) that's still 96% margin.

The voucher reduces ARPU by 10–20% on the *next* book, but since voucher-driven repeat purchases are pure incremental revenue (you wouldn't get them otherwise), they are net positive. Treat the voucher cost as marketing spend, not COGS — keeps gross margin reporting clean.

**These numbers comfortably clear the 70–80% gross margin target.**

---

## 15. Open Questions for Xiaoyu

These are the only things I'd flag as needing your call before Phase 1 starts. Everything else above is locked.

1. **Worker hosting:** Render Background Worker (~$7/mo) vs Railway (~$5/mo) — preference? They're equivalent technically.
2. **Email:** is Resend already set up in Readii, or do we need to add it? If you use a different provider, swap in Phase 4 step 19.
3. **Beta user list:** any existing customers you want auto-enrolled when this ships?
4. **Pricing display:** quote in £ only, or also show estimated cost in 元 (footnote, FX rate-locked daily)? My instinct is £ only — clean and avoids FX volatility complaints.

---

**End of spec.** Anything below this line is up to Claude Code's judgement within Readii's existing patterns.
