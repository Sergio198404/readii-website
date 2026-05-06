# Personal Library — Subscription Edition · Engineering Specification

**Status:** Ready for build · v2.0 (Subscription model)
**Owner:** Xiaoyu (Readii)
**Target:** Adults & international students. Daily-habit reading subscription.
**Build mode:** Self-contained spec. Claude Code reads this and builds end-to-end.

This spec **replaces** the v1.0 per-book spec. Where this spec contradicts v1.0, this spec wins.

---

## 0. TL;DR

A new feature inside LEARN that turns Readii into a daily-habit English reading coach for adults. Users subscribe at **£15/month** (7-day free trial, UK-compliant). Each user has **one active book** at a time — either uploaded by them (private) or chosen from Readii's curated **public-domain library** (~25 books at launch). Every morning at **07:30 London time**, the user receives a daily reading task: a chunk of text (≤20 minutes reading time, ≤5,000 words), British-English audio synthesised by **Azure Sonia Neural**, vocabulary explanations (CEFR B2+), and 5–8 representative sentences for pronunciation practice. The user must complete the task (audio listened ≥80%, full passage recorded, ≥3 sentences scored) before **21:00 the next day**. Wednesdays are rest days. Users get **3 freeze days/month** (planned skips) and can change books **2 times/month**. Hitting **80% on-time completion** earns a **30% discount** on next month; **60%** earns **10% off**. Users can invite up to 3 friends to **co-read** (subject to content approval — public-domain books always allowed, user-uploaded PDFs require Xiaoyu's manual review).

This functionality plugs into the existing Supabase + Netlify + Edge Functions stack, **plus one new Node.js worker** (Render or Railway, ~$7/month) for the long PDF→audio pipeline. Feature is gated by `user_profiles.pl_beta_access` for beta phase; flag flipped off for v1 launch.

---

## 1. Hard Rules (locked, non-negotiable)

These rules are the product. Do not let edge cases erode them.

| # | Rule |
|---|---|
| R1 | Subscription price: **£15/month**. No tiers. No HD upcharge in v1. |
| R2 | Free trial: **7 days**, requires payment method on file (Stripe `trial_period_days=7`) |
| R3 | Daily task delivered at **07:30 London time** (Europe/London — handles BST automatically) |
| R4 | Daily task deadline: **21:00 London time the next day** |
| R5 | **Wednesday = rest day**, no task delivered, doesn't count toward attendance |
| R6 | Daily reading length: **≤20 minutes** (≤2,600 words at 130 wpm); user can configure 5/10/15/20 min in settings |
| R7 | One active book per user at any moment |
| R8 | Freeze days: **3 per calendar month**, must be used proactively (today or future), cannot retroactively rescue yesterday |
| R9 | Book change: **2 per calendar month**, **7-day cooldown** between changes, **never during free trial** |
| R10 | Continuous loyalty rewards: **80% attendance → 30% off next month**, **60% → 10% off**, **<60% → no reward** |
| R11 | Attendance denominator = (days in billing period - Wednesdays - days before subscription start). Numerator = (real on-time completions + freeze days used) |
| R12 | Co-read group max: **4 people** (1 owner + 3 invitees) |
| R13 | Co-read on user-uploaded PDF: **requires Xiaoyu's manual approval** (48h SLA). Public-domain books: always co-readable |
| R14 | Co-read participants see only **today's task content**, no jumping ahead, no PDF download, no past chapter content |
| R15 | Co-read progress is **independent per person** — joining late means starting from day 1 of the book |
| R16 | If owner of a co-read group cancels subscription, they are asked: continue authorising B/C/D? Yes → group continues (owner exits). No → group disbands |
| R17 | Returning owner becomes a regular member, not the original owner. Owner role is non-transferable and non-recoverable |
| R18 | TTS budget per user per month: hard cap at **150,000 words** (covers max-config user reading 30 days × 5,000 words). Exceeded → system pauses delivery + emails Xiaoyu |
| R19 | All recordings auto-deleted after **90 days**. Users get email warning 7 days before deletion |
| R20 | Worker pre-generates content **2 days ahead** to give Azure/OpenAI a 48h retry window |

---

## 2. Architecture Overview

```
┌─────────────────────┐
│ Frontend (existing) │  /learn/personal-library/*
│ Feature-flagged via │  user_profiles.pl_beta_access
│ pl_beta_access      │
└──────────┬──────────┘
           │
   ┌───────┴────────────────┐
   ▼                        ▼
┌─────────────┐      ┌────────────────┐
│ Supabase    │◄─────│ Stripe         │
│ Edge Funcs  │      │ Subscriptions  │
│ (sync ops)  │      │ + Webhooks     │
└──────┬──────┘      └────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Supabase Postgres + RLS                       │
│ Tables (new):                                 │
│  - subscriptions                              │
│  - user_books                                 │
│  - user_book_chunks                           │
│  - user_book_attendance                       │
│  - user_freezes                               │
│  - user_book_changes                          │
│  - co_read_groups                             │
│  - co_read_members                            │
│  - public_books                               │
│  - referrals                                  │
│  - book_processing_jobs                       │
│  - daily_dispatch_log                         │
│  - approval_queue (admin: Xiaoyu)             │
└──────────────────────────────────────────────┘
       ▲                                    ▲
       │ writes                             │ writes
       │                                    │
┌──────┴────────────────┐    ┌─────────────┴──────────┐
│ NEW: Node.js worker   │    │ NEW: Cron scheduler     │
│ (Render/Railway)      │    │ (in same worker)        │
│  - PDF parse           │    │  - 07:30 daily dispatch │
│  - Azure TTS           │    │  - 21:00 deadline check │
│  - OpenAI vocab        │    │  - Monthly reward calc  │
│  - Pre-gen 2d ahead    │    │  - 90d recording purge  │
└────────────────────────┘    └─────────────────────────┘
```

**Cron timing — all in `Europe/London`:**
- `07:30` — dispatch today's task (already pre-generated, just flag `dispatched=true`)
- `09:30` — check yesterday's deadlines (yesterday 21:00 cutoff), mark missed days as failed
- `02:00` — pre-generate task content for D+2 (so D+1 is fully ready by tonight, D+2 is ready by tomorrow)
- `03:00 on day 1 of each month` — calculate previous month's attendance, apply rewards, reset freeze counts
- `04:00 daily` — purge recordings >90 days old; send 7-day-before warnings

---

## 3. Database Schema

All tables in `public` schema with RLS. Service role bypasses RLS for worker writes. Pattern: user can only see/modify their own rows.

### 3.1 Feature flag (extends existing table)

```sql
alter table public.user_profiles
  add column if not exists pl_beta_access boolean not null default false;

create index if not exists user_profiles_pl_beta_access_idx
  on public.user_profiles(pl_beta_access) where pl_beta_access = true;
```

**Beta launch:** seed Kevin_SU2022@163.com only. After v1 stable, run a migration to set `pl_beta_access = true` for all users (or simply remove the gate at frontend + Edge Function level).

### 3.2 Subscriptions

```sql
create table public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id          text not null,
  stripe_subscription_id      text not null unique,
  stripe_price_id             text not null,
  status                      text not null
    check (status in ('trialing','active','past_due','canceled','incomplete','paused')),
  trial_start                 timestamptz,
  trial_end                   timestamptz,
  current_period_start        timestamptz not null,
  current_period_end          timestamptz not null,
  cancel_at_period_end        boolean not null default false,
  canceled_at                 timestamptz,
  paused_at                   timestamptz,
  resumes_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create unique index subscriptions_user_active_idx
  on public.subscriptions(user_id)
  where status in ('trialing','active','past_due','paused');

alter table public.subscriptions enable row level security;
create policy "users see own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);
```

### 3.3 User books (active book per user)

```sql
create table public.user_books (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  source_type              text not null check (source_type in ('user_upload','public_domain')),
  source_pdf_path          text,                    -- null for public_domain
  public_book_id           uuid references public.public_books(id),
  title                    text not null,
  author                   text,
  total_pages              int,
  total_words              int not null,
  estimated_audio_seconds  int not null,
  voice_id                 text not null default 'sonia'
    check (voice_id in ('sonia','ryan')),
  daily_minutes            int not null default 15
    check (daily_minutes in (5,10,15,20)),
  total_days               int not null,
  status                   text not null default 'pending_processing'
    check (status in ('pending_processing','processing','active','completed','swapped_out','disbanded','failed')),
  failure_reason           text,
  is_active                boolean not null default false,    -- exactly one active book per user
  started_at               timestamptz,
  completed_at             timestamptz,
  swapped_out_at           timestamptz,
  current_day              int not null default 0,            -- 0 = haven't started; 1 = first task delivered
  created_at               timestamptz not null default now()
);

create unique index user_books_one_active_idx
  on public.user_books(user_id) where is_active = true;
create index user_books_user_idx on public.user_books(user_id);
create index user_books_status_idx on public.user_books(status);

alter table public.user_books enable row level security;
create policy "users see own books" on public.user_books
  for select using (auth.uid() = user_id);
```

### 3.4 User book chunks (daily tasks)

```sql
create table public.user_book_chunks (
  id                        uuid primary key default gen_random_uuid(),
  book_id                   uuid not null references public.user_books(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  day_number                int not null,
  start_page                int,
  end_page                  int,
  start_char_offset         int not null,
  end_char_offset           int not null,
  word_count                int not null,
  estimated_seconds         int not null,
  text_content              text not null,
  audio_path                text,
  audio_duration_seconds    int,
  vocabulary                jsonb,    -- [{word, ipa, chinese, example}]
  representative_sentences  jsonb,    -- [{sentence, target_phonemes:[]}]
  generation_status         text not null default 'pending'
    check (generation_status in ('pending','generating','ready','failed')),
  scheduled_dispatch_date   date not null,           -- which calendar day this chunk is for
  dispatched_at             timestamptz,             -- when system marked it as "today's task"
  created_at                timestamptz not null default now(),
  unique (book_id, day_number)
);

create index user_book_chunks_book_idx on public.user_book_chunks(book_id);
create index user_book_chunks_user_idx on public.user_book_chunks(user_id);
create index user_book_chunks_dispatch_idx
  on public.user_book_chunks(scheduled_dispatch_date) where dispatched_at is null;

alter table public.user_book_chunks enable row level security;
create policy "users see own chunks" on public.user_book_chunks
  for select using (auth.uid() = user_id);
```

### 3.5 Attendance (per-day record)

```sql
create table public.user_book_attendance (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references auth.users(id) on delete cascade,
  book_id                       uuid not null references public.user_books(id) on delete cascade,
  chunk_id                      uuid not null references public.user_book_chunks(id) on delete cascade,
  task_date                     date not null,                -- the date task was for
  audio_progress_seconds        int not null default 0,
  audio_total_seconds           int not null,
  full_recording_path           text,                          -- entire passage recording
  full_recording_duration_sec   int,
  sentence_attempts_count       int not null default 0,
  status                        text not null default 'pending'
    check (status in ('pending','completed_on_time','completed_late','missed','frozen')),
  completed_at                  timestamptz,
  freeze_id                     uuid references public.user_freezes(id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (user_id, task_date)
);

create index user_book_attendance_user_idx on public.user_book_attendance(user_id, task_date);
create index user_book_attendance_status_idx on public.user_book_attendance(status);

alter table public.user_book_attendance enable row level security;
create policy "users see own attendance" on public.user_book_attendance
  for select using (auth.uid() = user_id);
create policy "users update own attendance" on public.user_book_attendance
  for update using (auth.uid() = user_id);
```

### 3.6 Freeze days

```sql
create table public.user_freezes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  task_date       date not null,                -- which date is being frozen
  used_at         timestamptz not null default now(),
  billing_month   text not null,                -- 'YYYY-MM' for tracking 3/month limit
  unique (user_id, task_date)
);

create index user_freezes_user_month_idx
  on public.user_freezes(user_id, billing_month);

alter table public.user_freezes enable row level security;
create policy "users see own freezes" on public.user_freezes
  for select using (auth.uid() = user_id);
create policy "users insert own freezes" on public.user_freezes
  for insert with check (auth.uid() = user_id);
```

### 3.7 Book changes (audit log)

```sql
create table public.user_book_changes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  from_book_id        uuid references public.user_books(id),
  to_book_id          uuid not null references public.user_books(id),
  changed_at          timestamptz not null default now(),
  billing_month       text not null,
  reason              text                                    -- optional user-provided reason
);

create index user_book_changes_user_month_idx
  on public.user_book_changes(user_id, billing_month);

alter table public.user_book_changes enable row level security;
create policy "users see own changes" on public.user_book_changes
  for select using (auth.uid() = user_id);
```

### 3.8 Co-read groups & members

```sql
create table public.co_read_groups (
  id                    uuid primary key default gen_random_uuid(),
  book_id               uuid not null references public.user_books(id) on delete cascade,
  source_type           text not null check (source_type in ('user_upload','public_domain')),
  owner_user_id         uuid references auth.users(id),       -- nullable: see disband logic
  approval_status       text not null default 'auto_approved'
    check (approval_status in ('auto_approved','pending_review','approved','rejected')),
  rejection_reason      text,
  invite_code           text not null unique,                  -- short shareable code
  created_at            timestamptz not null default now(),
  approved_at           timestamptz,
  reviewed_by           uuid references auth.users(id),         -- Xiaoyu's UUID
  is_active             boolean not null default true,
  disbanded_at          timestamptz
);

create index co_read_groups_invite_idx on public.co_read_groups(invite_code);
create index co_read_groups_book_idx on public.co_read_groups(book_id);

alter table public.co_read_groups enable row level security;
-- Members can see their groups; owner can see; admin (Xiaoyu) sees all via service role
create policy "members see own groups" on public.co_read_groups for select
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.co_read_members
      where group_id = co_read_groups.id and user_id = auth.uid()
    )
  );


create table public.co_read_members (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.co_read_groups(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  member_book_id  uuid not null references public.user_books(id),  -- their personal copy of the book progress
  role            text not null check (role in ('owner','member')),
  joined_at       timestamptz not null default now(),
  left_at         timestamptz,
  is_active       boolean not null default true,
  unique (group_id, user_id)
);

create index co_read_members_group_idx on public.co_read_members(group_id);
create index co_read_members_user_idx on public.co_read_members(user_id);

alter table public.co_read_members enable row level security;
create policy "users see groups they belong to" on public.co_read_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.co_read_members me
      where me.group_id = co_read_members.group_id and me.user_id = auth.uid()
    )
  );
```

### 3.9 Public domain books (Readii-curated)

```sql
create table public.public_books (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,
  author                   text not null,
  source_url               text,                                 -- e.g. Project Gutenberg URL
  cover_image_path         text,
  description              text,
  description_zh           text,
  cefr_level               text check (cefr_level in ('B1','B2','C1','C2')),
  total_words              int not null,
  total_pages              int,
  master_pdf_path          text not null,                        -- shared PDF in storage
  master_chunks_metadata   jsonb,                                -- pre-computed chunk boundaries
  is_published             boolean not null default false,
  published_at             timestamptz,
  created_at               timestamptz not null default now()
);

-- Cached audio for public books (shared across users at same daily_minutes setting)
create table public.public_book_audio_cache (
  id                       uuid primary key default gen_random_uuid(),
  public_book_id           uuid not null references public.public_books(id) on delete cascade,
  daily_minutes            int not null check (daily_minutes in (5,10,15,20)),
  voice_id                 text not null check (voice_id in ('sonia','ryan')),
  day_number               int not null,
  audio_path               text not null,
  audio_duration_seconds   int not null,
  vocabulary               jsonb,
  representative_sentences jsonb,
  text_content             text not null,
  start_char_offset        int,
  end_char_offset          int,
  created_at               timestamptz not null default now(),
  unique (public_book_id, daily_minutes, voice_id, day_number)
);

-- public_books visible to everyone (no RLS needed for SELECT)
alter table public.public_books enable row level security;
create policy "anyone can read public books" on public.public_books for select using (is_published = true);

alter table public.public_book_audio_cache enable row level security;
create policy "anyone can read cached audio metadata" on public.public_book_audio_cache for select using (true);
```

### 3.10 Referrals

```sql
create table public.referrals (
  id                       uuid primary key default gen_random_uuid(),
  referrer_user_id         uuid not null references auth.users(id) on delete cascade,
  referrer_code            text not null,
  referred_user_id         uuid references auth.users(id),
  referred_email           text,
  status                   text not null default 'pending'
    check (status in ('pending','signed_up','converted','expired')),
  reward_pence             int not null default 500,    -- £5
  reward_applied           boolean not null default false,
  reward_applied_at        timestamptz,
  signed_up_at             timestamptz,
  converted_at             timestamptz,                  -- when referred user starts paying (post-trial)
  created_at               timestamptz not null default now()
);

create index referrals_referrer_idx on public.referrals(referrer_user_id);
create index referrals_code_idx on public.referrals(referrer_code);
create index referrals_referred_idx on public.referrals(referred_user_id);

alter table public.referrals enable row level security;
create policy "users see own referrals" on public.referrals for select
  using (auth.uid() = referrer_user_id);

-- One-time-use referrer code per user
create table public.user_referral_codes (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  code                     text not null unique,
  total_referrals          int not null default 0,
  total_reward_pence       int not null default 0,
  reward_cap_pence         int not null default 1500,    -- £15 cap
  created_at               timestamptz not null default now()
);

alter table public.user_referral_codes enable row level security;
create policy "users see own code" on public.user_referral_codes for select
  using (auth.uid() = user_id);
```

### 3.11 Operational tables (worker queue + admin queue + dispatch log)

```sql
create table public.book_processing_jobs (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.user_books(id) on delete cascade,
  job_type        text not null check (job_type in ('full_processing','chunk_pregeneration')),
  target_day      int,                                  -- for chunk_pregeneration
  status          text not null default 'queued'
    check (status in ('queued','running','succeeded','failed')),
  attempts        int not null default 0,
  last_error      text,
  enqueued_at     timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz
);
create index book_processing_jobs_status_idx on public.book_processing_jobs(status, enqueued_at);

create table public.daily_dispatch_log (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  book_id                uuid not null references public.user_books(id) on delete cascade,
  task_date              date not null,
  chunk_id               uuid not null references public.user_book_chunks(id),
  dispatch_status        text not null
    check (dispatch_status in ('success','skipped_wednesday','skipped_no_book','skipped_paused','failed_no_chunk')),
  error                  text,
  dispatched_at          timestamptz not null default now(),
  unique (user_id, task_date)
);

create index daily_dispatch_log_date_idx on public.daily_dispatch_log(task_date, dispatch_status);

create table public.approval_queue (
  id                    uuid primary key default gen_random_uuid(),
  group_id              uuid not null references public.co_read_groups(id) on delete cascade,
  book_id               uuid not null references public.user_books(id) on delete cascade,
  submitted_by_user_id  uuid not null references auth.users(id),
  pdf_path              text not null,
  user_declared_rights  text not null,                  -- the text the user typed declaring ownership
  submitted_at          timestamptz not null default now(),
  decision              text check (decision in ('approved','rejected')),
  decision_reason       text,
  decided_at            timestamptz,
  decided_by            uuid references auth.users(id),
  sla_deadline          timestamptz not null            -- submitted_at + 48 hours
);

create index approval_queue_pending_idx on public.approval_queue(sla_deadline)
  where decision is null;
```

---

## 4. Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `user-pdfs` | User-uploaded PDFs | Private, user-prefixed |
| `user-book-audio` | Per-user generated audio chunks | Private, signed URLs |
| `user-book-recordings` | User's full-passage daily recordings + sentence recordings | Private, 90d auto-purge |
| `public-book-pdfs` | Public-domain master PDFs | Read-only public (Readii-curated) |
| `public-book-audio` | Cached public-book audio (shared) | Public read (signed URLs ok too) |
| `public-book-covers` | Cover images for public book browsing | Public read |
| `voice-previews` | 30-second TTS previews (Sonia/Ryan) | Public read |

Cleanup cron jobs:
- Recordings >90 days: delete (with 7-day warning email)
- Inactive subscription's user data: retain (don't delete) — user might resub
- Cancelled subscription's PDFs: retain for 30 days, then delete + email user

---

## 5. Pricing & Rewards

### 5.1 Stripe configuration

Single product, single price:
- **Product name:** Readii Personal Library
- **Price:** £15.00 / month, GBP, recurring
- **Trial:** `trial_period_days = 7`
- **Tax handling:** Stripe Tax automatic (UK VAT)
- **Cancel behaviour:** `cancel_at_period_end` — user keeps access until period end

### 5.2 Attendance calculation (R10, R11)

```typescript
function calculateMonthlyAttendance(
  userId: string,
  billingMonth: string  // 'YYYY-MM'
): {
  totalRequiredDays: number;
  onTimeCount: number;
  frozenCount: number;
  attendancePct: number;
  reward: 'big' | 'small' | 'none';
  rewardPence: number;
} {
  // total_required_days = (calendar days in billing period covered by sub)
  //                     - Wednesdays
  //                     - days before subscription_start_in_month
  //                     - days during paused subscription
  //                     - days after cancel_effective_date

  // counted = on_time_completions + freezes_used (capped at 3)

  // attendance_pct = counted / total_required_days

  // if attendance_pct >= 0.80: big reward = 30% off next month = 450 pence
  // else if attendance_pct >= 0.60: small reward = 10% off next month = 150 pence
  // else: no reward
}
```

The reward is applied as a **Stripe Coupon** on the next invoice — no user action needed. Notification: email + in-app banner.

### 5.3 Referral rewards

- Referrer gets £5 credit when referred user converts (i.e., trial ends + first £15 charge succeeds)
- Referred user gets £5 credit on their first paid month (trial day 7 charge becomes £10)
- Cap: referrer's lifetime referral reward ≤ £15
- Codes are case-insensitive, 6-char alphanumeric (avoid I/O/0/1)

---

## 6. External Services & Environment

```bash
# Azure Speech (UK region)
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=uksouth

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_RETURN_URL=https://readii.co.uk/learn/personal-library
STRIPE_PORTAL_RETURN_URL=https://readii.co.uk/account

# Resend
RESEND_API_KEY=
RESEND_FROM=Readii <hello@readii.co.uk>

# App
APP_TIMEZONE=Europe/London
READING_WPM=130
DISPATCH_HOUR=7
DISPATCH_MINUTE=30
DEADLINE_HOUR=21
DEADLINE_MINUTE=0
PREGEN_DAYS_AHEAD=2
WEDNESDAY_REST=true

# Limits
MAX_PDF_BYTES=52428800
MAX_PDF_PAGES=800
TTS_BUDGET_WORDS_MONTHLY=150000
RECORDING_RETENTION_DAYS=90
RECORDING_WARNING_DAYS_BEFORE=7

# Worker
WORKER_POLL_INTERVAL_MS=5000
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=

# Approval SLA
APPROVAL_SLA_HOURS=48
ADMIN_USER_ID=                       # Xiaoyu's user UUID
ADMIN_ALERT_EMAIL=hello@readii.co.uk
```

### 6.1 Voice mapping

| voice_id | Azure voice |
|---|---|
| `sonia` | `en-GB-SoniaNeural` (default) |
| `ryan` | `en-GB-RyanNeural` |

HD voices deferred to v2.

### 6.2 OpenAI prompts (same as v1.0 spec §6.3)

Use `gpt-4o-mini` for vocab + sentence selection. Prompts in v1.0 §6.3 are unchanged.

---

## 7. Edge Functions (synchronous endpoints)

All under `/functions/v1/`. Auth via Supabase JWT. **All Personal Library endpoints check `pl_beta_access` flag during beta.**

### 7.1 Subscription lifecycle

#### `POST /personal-library-start-trial`
Creates Stripe Customer + Subscription with 7-day trial. User must provide payment method (Stripe Setup Intent flow).

Request: `{ payment_method_id: string, referrer_code?: string }`
Response: `{ subscription_id, trial_end, status }`

Side effects:
- Create row in `subscriptions`
- If referrer_code valid, create `referrals` row with status='signed_up'
- Create `user_referral_codes` row for new user
- Email: "Welcome to Readii Personal Library — your trial is live"

#### `POST /personal-library-cancel`
Cancels subscription at period end (UK compliance: easy cancel).
Request: `{ confirm: true }`
Response: `{ canceled_at, access_until }`

Side effects:
- `subscriptions.cancel_at_period_end = true`
- If user owns active co-read groups: triggers ownership-transfer flow (separate endpoint)
- Email confirms cancellation + access end date

#### `POST /personal-library-pause`
(Optional v1 feature) Pause subscription for up to 30 days. Stripe `pause_collection`.

#### `POST /personal-library-stripe-webhook`
Handles:
- `customer.subscription.created` / `.updated` / `.deleted`
- `invoice.upcoming` (7 days before — trigger renewal-reminder email per UK compliance)
- `invoice.paid` — clear past_due, update period dates, evaluate previous-month reward, possibly apply coupon
- `invoice.payment_failed` — set status='past_due', email user
- `payment_method.attached` — for trial signup flow

Idempotent: every event has `stripe_event_id` recorded; duplicate events ignored.

### 7.2 Book management

#### `POST /personal-library-upload-pdf`
Multipart upload. Validates size, pages, scan detection, language detection. Creates `user_books` row in status='pending_processing'. Enqueues processing job.

Request: `pdf` (file), `daily_minutes`, `voice_id`
Response: `{ book_id, estimated_total_days, processing_status }`

#### `POST /personal-library-select-public-book`
User picks a public-domain book. No PDF upload, no waiting — audio is already cached.

Request: `{ public_book_id, daily_minutes, voice_id }`
Response: `{ book_id, ready: true, current_day: 0 }`

If user has an active book, this fails with `ACTIVE_BOOK_EXISTS` — they must complete or change_book.

#### `GET /personal-library-public-books`
Returns the catalog. Supports filtering:
- `?cefr=B2`
- `?length=short|medium|long` (mapped to total_words ranges)
- `?author=`
- `?search=`

#### `POST /personal-library-change-book`
User decides to swap. Enforces R9: 2/month, 7-day cooldown, never during trial.

Request: `{ new_source_type, new_pdf_id_or_public_id, daily_minutes?, voice_id? }`
Response: `{ new_book_id, change_count_this_month, next_change_available_at }`

Effects:
- Old book: `status='swapped_out', is_active=false`
- Today's task (if delivered): cancelled, doesn't count attendance
- Upcoming pre-generated chunks: marked obsolete
- New book: dispatched starting D+2 (worker needs 2 days)
- Insert `user_book_changes` row

Errors: `TRIAL_NO_CHANGE`, `MONTHLY_LIMIT_REACHED`, `COOLDOWN_ACTIVE`

### 7.3 Daily task

#### `GET /personal-library-today`
Returns today's task for the user. Uses `daily_dispatch_log` to find which chunk was dispatched.

Response:
```json
{
  "task_date": "2026-05-07",
  "is_rest_day": false,
  "book": { "id":"...", "title":"...", "current_day":3, "total_days":26 },
  "chunk": {
    "id":"...",
    "day_number": 3,
    "text_content": "...",
    "audio_url": "https://...signed...60s",
    "audio_duration_seconds": 720,
    "vocabulary": [...],
    "representative_sentences": [...]
  },
  "deadline": "2026-05-08T21:00:00+01:00",
  "freeze_available": true,
  "freezes_remaining_this_month": 2,
  "co_read_group": { "id":"...", "members":[{name,today_completion_pct}] }   // null if solo
}
```

If no task today (rest day, no active book, paused, before subscription start):
```json
{ "task_date":"...", "is_rest_day":true, "reason":"wednesday_rest"|"no_active_book"|"paused"|"trial_not_started" }
```

#### `POST /personal-library-record-progress`
Called periodically while user is reading/listening. Updates `audio_progress_seconds`.

Request: `{ chunk_id, audio_progress_seconds }`

#### `POST /personal-library-submit-recording`
User uploads their full-passage recording.

Multipart: `audio` (webm), `chunk_id`
Response: `{ accepted, recording_path, duration_seconds }`

Validation: duration must be ≥30% of expected (rough check that user actually read, not just submitted silence).

#### `POST /personal-library-submit-sentence-attempt`
Reuses existing pronunciation scoring (Web Speech API on client + LCS scoring on server). Writes to `pronunciation_attempts` with `source_type='personal_library'`.

#### `POST /personal-library-mark-complete`
Final action of the day. Validates:
- Audio progress ≥80% of duration
- Full recording uploaded
- ≥3 sentence attempts recorded

If passes: `user_book_attendance.status = 'completed_on_time'` (if before deadline) or `'completed_late'`. Updates `user_books.current_day++`.

If book finished: marks `user_books.status='completed'`, sends celebration email.

#### `POST /personal-library-use-freeze`
Apply a freeze to a future date.

Request: `{ task_date }` (must be today or future, ≤7 days ahead)
Response: `{ freeze_id, freezes_remaining_this_month }`

Errors: `MONTHLY_LIMIT_REACHED`, `DATE_IN_PAST`, `WEDNESDAY_NOT_FREEZABLE`, `ALREADY_FROZEN`

### 7.4 Co-read

#### `POST /personal-library-create-coread-group`
Creates a co-read group around the user's current book.

Request: `{ }` (uses current active book)
Response:
- For public_domain books: `{ group_id, invite_code, status:'auto_approved' }`
- For user_upload: `{ group_id, status:'pending_review', sla_deadline }` + adds row to `approval_queue`

#### `POST /personal-library-join-coread`
User accepts a co-read invite.

Request: `{ invite_code }`
Response: `{ group_id, member_book_id, owner_name }`

Validations:
- Invite code valid
- Group is 'auto_approved' OR 'approved' (cannot join 'pending_review')
- Group is_active = true
- Group has <4 members
- Joiner has an active subscription (trial or paid)
- Joiner doesn't already have an active book → if they do, asks them to swap

When a user joins:
- If joiner has no active book → create new `user_books` for them with `source_type='public_domain'` or `source_type='user_upload'` referencing the same source content (text + audio shared)
- They start at day 1 of the book (R15 — joining late = from the start)
- Pre-gen worker queues their first 3 days' content (or, for public books, immediately serves cached audio)

#### `POST /personal-library-leave-coread`
User leaves a group. Their `user_books` becomes a private continuation (they keep reading solo).

#### `POST /personal-library-coread-disband-flow`
Triggered when group owner cancels subscription. Asks owner: continue authorising members? (R16)

Request: `{ group_id, authorize_continuation: boolean }`
Response: `{ group_status }`

If yes: `co_read_groups.owner_user_id = null`, group continues. Member-owner is gone but content stays accessible.
If no: `co_read_groups.is_active=false`, all members lose access at next dispatch.

### 7.5 Admin (Xiaoyu only)

These endpoints check `auth.uid() = ADMIN_USER_ID`. Used by an internal `/admin/personal-library/approval-queue` page.

#### `GET /personal-library-admin-approval-queue`
Returns pending review items.

#### `POST /personal-library-admin-decide`
Request: `{ approval_id, decision:'approved'|'rejected', reason? }`

If approved: group becomes `auto_approved`, owner gets email "your co-read is live".
If rejected: group `is_active=false`, book stays as private (R+SLA). Owner gets email "we couldn't open co-read for this book — you can continue reading privately, no charge change".

---

## 8. Worker (Node.js, deployed to Render or Railway)

Hosting: **Render** Background Worker, $7/month. (Railway is fine alternative — equivalent.)

### 8.1 Loops (3 concurrent)

**Loop A: book processing queue**
Picks `book_processing_jobs` rows where `status='queued'`. For `job_type='full_processing'`: extract PDF, chunk, generate first 3 days of audio + vocab + sentences. For `chunk_pregeneration`: generate one specific day.

**Loop B: cron scheduler** (using `node-cron`, all in `Europe/London`)
- `30 7 * * *` — dispatch today's chunks (skip Wednesdays)
- `30 9 * * *` — check yesterday 21:00 deadlines, mark missed
- `0 2 * * *` — pre-generate D+2 chunks for all active users
- `0 3 1 * *` — month-rollover: calculate rewards, reset freeze counts, apply Stripe coupons
- `0 4 * * *` — recording purge (>90d) + 7-day warnings
- `0 */6 * * *` — approval SLA check: alert Xiaoyu if any approval >40h pending

**Loop C: live request worker** (only if needed for spikes — v1 not required)

### 8.2 Dispatch logic (07:30)

```typescript
async function dispatchToday() {
  const today = londonToday();
  if (today.getDay() === 3) return; // Wednesday

  const activeUsers = await getActiveSubscribers();

  for (const user of activeUsers) {
    const book = await getActiveBook(user.id);
    if (!book) {
      log(user.id, today, 'skipped_no_book');
      continue;
    }
    if (book.status === 'processing') {
      log(user.id, today, 'skipped_book_not_ready');
      // also email user "your book is still being prepared"
      continue;
    }

    const nextDay = book.current_day + 1;
    const chunk = await getChunk(book.id, nextDay);
    if (!chunk || chunk.generation_status !== 'ready') {
      log(user.id, today, 'failed_no_chunk');
      // alert Xiaoyu
      await alertAdmin(`Dispatch failure for ${user.id}, book ${book.id}, day ${nextDay}`);
      continue;
    }

    // Create attendance row in 'pending'
    await createAttendanceRow(user.id, book.id, chunk.id, today, chunk.audio_duration_seconds);

    // Mark chunk dispatched + bump book.current_day
    await markChunkDispatched(chunk.id);
    await bumpCurrentDay(book.id, nextDay);

    // Send email + in-app notification
    await sendDailyTaskEmail(user, book, chunk);

    log(user.id, today, 'success');
  }
}
```

### 8.3 Deadline check (09:30 next morning)

```typescript
async function checkYesterdayDeadlines() {
  const yesterday = londonToday(); yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.getDay() === 3) return; // No tasks dispatched on Wednesday

  const pending = await getPendingAttendance(yesterday);
  for (const att of pending) {
    // Check if user used a freeze for this date
    const freeze = await getFreeze(att.user_id, yesterday);
    if (freeze) {
      await markFrozen(att.id, freeze.id);
      continue;
    }
    // Otherwise: missed
    await markMissed(att.id);
    await sendMissedDayEmail(att.user_id);
  }
}
```

### 8.4 Pre-generation logic (02:00)

For every active user with an active book whose `current_day + 2 ≤ total_days`:
- If chunk for `current_day + 2` doesn't exist or is in 'failed' status → enqueue chunk_pregeneration

This gives a 48h buffer before a chunk is needed.

### 8.5 Month rollover (03:00 on day 1 of month)

For every user who had an active subscription last month:
- Calculate `attendance_pct` (R11)
- Determine reward
- If reward ≠ 'none': create Stripe Coupon (`percent_off=30 or 10`, `duration='once'`), apply to upcoming invoice
- Send email + create in-app banner record
- Reset freeze count (no DB action — `user_freezes.billing_month` filtering does this naturally)

---

## 9. Frontend

### 9.1 Routes

```
/learn/personal-library                              landing — current task or empty state
/learn/personal-library/onboarding                   trial signup wizard (4 steps)
/learn/personal-library/today                        focused daily task screen
/learn/personal-library/library                      browse public books + my upload form
/learn/personal-library/upload                       PDF upload form
/learn/personal-library/book/{book_id}               book overview, change book, leave
/learn/personal-library/coread                       my co-read groups
/learn/personal-library/coread/{group_id}            group view: members, progress
/learn/personal-library/coread/join/{invite_code}    join a group
/learn/personal-library/account                      subscription, freezes, rewards, referral code
/admin/personal-library/approvals                    Xiaoyu only — approval queue
```

### 9.2 Onboarding wizard (4 steps)

1. **Welcome** — explains daily 5–20 min reading, 7-day free trial, £15/mo after
2. **Pick your reading length** — 5 / 10 / 15 / 20 min (default 15)
3. **Pick your starter book** — show 6 popular public books OR upload your own
4. **Payment method** — Stripe Setup Intent, no charge until day 8

After onboarding: redirect to `/today` showing tomorrow morning's first task scheduled.

### 9.3 `/today` screen

Hero: book title, day N of M, progress ring.

Three states:
- **Pre-dispatch (before 07:30)**: "Your next task arrives at 07:30 tomorrow"
- **Active task**: full reader UI
- **Completed today**: celebration screen + "Come back tomorrow at 07:30"
- **Wednesday**: "It's Wednesday — your rest day. See you tomorrow."

**Active task UI:**
- Top: book info + day counter + deadline countdown ("ends in 8h 22m")
- Text reader (clean typography, scrollable)
- Audio player (▶, scrub, 0.75x–1.5x speed, autosave position every 5s)
- Vocabulary drawer (collapsible side panel, 8–12 words)
- Sentence practice block (5–8 sentences, each with 🔊 listen + 🎤 record + score)
- Full-passage recording: dedicated recording UI, "Read the entire passage aloud"
- "Mark complete" button: gated by R6 conditions (≥80% audio, full recording, ≥3 sentence attempts)
- Freeze button: "Need to skip today? Use a freeze (2 left this month)"

### 9.4 `/coread/{group_id}` view

Members panel (up to 4 avatars), each showing:
- Name (first name + last initial)
- Their book day number
- Today's status (pending/completed/missed/frozen)
- Tap to see their representative-sentence scores (not their recording — privacy)

Group chat: out of scope for v1 (consider for v1.1).

### 9.5 Compliance UI requirements (UK Digital Markets Act)

- **Onboarding step 4**: clear copy "7 days free, then £15/month. Cancel anytime." Not in fine print.
- **In `/account`**: "Cancel subscription" button is one click → confirmation screen → cancelled. No friction.
- **Day 5 of trial**: large in-app banner "Your trial ends in 2 days. £15 will be charged on {date}. Cancel anytime."
- **7 days before each renewal**: same banner + email.

### 9.6 Bilingual copy

Every string has data-en + data-zh. New i18n bundle: `i18n/personal-library-subscription.ts`. Sample keys:

| Key | EN | 中文 |
|---|---|---|
| nav.personal_library | Personal Library | 个人书库 |
| onboarding.welcome.title | A daily English reading habit, with a British coach | 养成英式英语日读习惯 |
| onboarding.welcome.body | 5–20 minutes a day. Sonia reads to you. You read to her. We track your progress. | 每天 5-20 分钟。Sonia 读给你听。你读给她听。我们记录你的进步。 |
| trial.banner | {days} days left in your free trial · cancel anytime | 免费试用还剩 {days} 天 · 可随时取消 |
| trial.ending_soon | Your trial ends in 2 days. £15 will be charged on {date}. | 试用还剩 2 天，将于 {date} 扣款 £15 |
| today.deadline | Complete by {time} tonight | 今晚 {time} 前完成 |
| today.rest_day | Wednesday rest day — see you tomorrow at 07:30 | 周三休息日 — 明早 07:30 见 |
| today.mark_complete | Mark today complete | 标记今日完成 |
| today.use_freeze | Skip today (freeze, {n} left) | 今日冻结（剩 {n} 张） |
| reward.big.banner | You earned 30% off next month for hitting 80% attendance. | 出勤率达 80%，下月 7 折奖励已应用 |
| reward.small.banner | You earned 10% off next month. | 下月已享 9 折奖励 |
| coread.create.public | Invite up to 3 friends to read with you | 邀请最多 3 位朋友一起读 |
| coread.create.private.pending | We need 48h to review this content for co-reading. You can keep reading privately. | 共读功能需要 48 小时审核。你可以继续私人阅读。 |
| coread.create.private.rejected | We couldn't open co-read for this content. You can continue reading privately. | 此内容暂不能开启共读。你仍可私人阅读。 |
| change_book.cooldown | You can change books again on {date} | {date} 起可再次更换书籍 |

---

## 10. Edge Cases

| Case | Behaviour |
|---|---|
| User uploads PDF on Tuesday, processing fails | Email user, no charge during trial; if paid, no refund (subscription fee is for service access, not specific book). Offer to pick a public book instead. |
| User starts trial Mon, today is Sun, 7-day trial expires Mon next week | Stripe handles. First charge attempts on day 8; retries 3 times over 14 days if fails. |
| User has 0 active books on day 2 of trial | `/today` shows "Pick a book to start". No task dispatched. No attendance penalty. |
| User changes book on Tuesday morning | Today's already-dispatched task: cancelled, doesn't count. New book first task dispatched on Thursday morning (D+2). Wed in between is rest. |
| User uses freeze for tomorrow, then changes mind today | Freeze can be cancelled if task_date is still in future. Cancellation returns the freeze. After date passes: can't cancel. |
| Co-read owner takes 1 freeze; member doesn't | They are independent. Owner's freeze doesn't apply to member. |
| Co-read group's PDF is rejected after 4 people already joined | Joiners get email "co-read couldn't be opened for this content. You're now reading privately. Your subscription continues." Each member's `user_books` row stays active solo. |
| User on day 18 of book changes books | Old book status='swapped_out'. Progress saved but not resumable. New book starts day 1. |
| Subscription past_due → user fixes payment 2 days later | During past_due: dispatch suspends, attendance days during this window don't count toward denominator. After fix: resume. |
| Subscription cancelled mid-month, period ends day 17 | Days 1–17 count toward attendance. Reward (if any) applied to nothing (no next invoice). Email user: "you earned X% off — resub within 30 days to use it." |
| User deletes account | Stripe sub cancelled immediately. All user data anonymised in 30 days. Co-read groups they own: disbanded immediately. |
| Worker behind, today is 07:35 and no task dispatched | Dispatch runs late (catch-up). User opens app at 07:35 to "no task yet" → 5 minutes later refreshes, task is there. Email goes out at actual dispatch time. |
| User plays audio at 1.5x and finishes in 50% of duration_seconds | Audio progress is measured by playback completeness, not real-time. So 1.5x finishing = 100% progress. |
| Two users in different timezones | Everyone is on London time. International users see London time clearly labelled in `/today`. v2 may add per-user TZ. |
| User in China can't reach Stripe | Stripe Checkout works in China via Alipay/WeChat Pay (Stripe supports these). If user can't load Stripe, can't subscribe — known v1 limitation. |
| Public book PDF too long (>5h audio) | Truncate to first 5h of audio for v1 — full book read uses many billing cycles. UX: show progress bar with milestones. |
| Recording upload fails (network) | Client retries 3x with backoff. If fails: queues locally, sends in next session. "Mark complete" button blocked until upload succeeds. |
| User on trial day 7 cancels subscription at 23:59 | No charge. Access ends at end of trial period. Can resubscribe later, but no new free trial (Stripe metadata flag). |
| Same person tries 2nd trial with new email | Stripe Radar + email match should catch most. v1 acceptable risk; if abuse seen, add stricter checks. |

---

## 11. TTS Cost Model

For the **most expensive** user (20 min/day × 30 days × 2,600 words/day = 78,000 words):

- TTS: 78,000 words × 5 chars/word × £12/M chars = **£4.68/month**

Average user (10 min/day, 26 days/month, 1,300 words/day = 33,800 words):
- TTS: 33,800 × 5 × £12/M = **£2.03/month**

Plus per-user month:
- OpenAI vocab + sentences: £0.05
- Stripe: 1.4% + 20p = £0.41
- Worker compute (amortised across users): £0.10
- Storage + bandwidth: £0.05

**Average user margin: £15 - (£2.03 + £0.05 + £0.41 + £0.10 + £0.05) = £12.36 / £15 = 82% gross margin** ✅

**Worst case user margin: £15 - £5.29 = £9.71 / £15 = 65%** — still healthy. R18's 150k cap kicks in at this exact ceiling.

Public-domain books contribute **£0** TTS to per-user margin (audio is shared cache). If 50% of users pick public books, blended margin >85%.

---

## 12. Acceptance Criteria

A user with `pl_beta_access=true`:

**Onboarding**
- [ ] Lands on `/learn/personal-library`, sees Beta banner + clear "Start 7-day free trial" CTA
- [ ] Can pick reading length, pick a public book, add a payment method, complete trial signup
- [ ] Receives welcome email
- [ ] Sees "First task arrives tomorrow at 07:30 London time"

**Daily flow**
- [ ] Next day at 07:30, receives email + has dispatched task in `/today`
- [ ] Can play audio (Sonia voice), at 0.75x–1.5x, see progress autosave
- [ ] Can record full passage, recording uploads, plays back
- [ ] Can record at least 3 sentences, see scores (reuses existing scoring)
- [ ] Can mark day complete only when all 3 conditions met
- [ ] Streak increments
- [ ] On Wednesday, sees rest day screen, no task

**Freezes**
- [ ] Can use a freeze for tomorrow; freeze count decreases
- [ ] Cannot use freeze for yesterday
- [ ] Cannot freeze on Wednesday (no task to freeze)
- [ ] Cannot use 4th freeze in same month

**Book change**
- [ ] Can change book once with no error
- [ ] After change, today's task cancelled, D+2 has new book's task
- [ ] Cannot change book during trial period
- [ ] Cannot change book within 7 days of last change
- [ ] Cannot change book a 3rd time in same month

**Co-read (public book)**
- [ ] Can create co-read group on public book — instant approval
- [ ] Can share invite code; friend joins (also subscribed); group has 2 members
- [ ] Both members independently progress on day 1; can see each other's progress
- [ ] 4th member tries to join, blocked (group full)

**Co-read (uploaded PDF)**
- [ ] Can request co-read on uploaded PDF
- [ ] Group shows "pending review" status; cannot share invite yet
- [ ] Xiaoyu sees in `/admin/personal-library/approvals`; approves
- [ ] User receives email; group becomes shareable
- [ ] If rejected: user receives email; group disbanded; private reading continues

**Subscription**
- [ ] Day 5 of trial, sees clear banner about upcoming charge
- [ ] On day 8, charged £15
- [ ] Can cancel from `/account` in one click
- [ ] After cancel: continue using until period end, then locked out
- [ ] If had earned 30% reward, sees "resubscribe in 30 days to use £4.50 credit"

**Rewards**
- [ ] Hits 80% attendance in month 1 → on day 1 of month 2, invoice = £10.50
- [ ] Hits 65% attendance → invoice = £13.50
- [ ] Hits 50% attendance → invoice = £15

**Referrals**
- [ ] Can copy own referral code from `/account`
- [ ] Friend uses code at signup → after their first £15 charge, both get £5 credit
- [ ] After 3 successful referrals (£15 cap), no more rewards but code still works

**Admin (Xiaoyu)**
- [ ] Can view `/admin/personal-library/approvals` queue
- [ ] Can approve / reject with reason
- [ ] Receives email alert if any approval is >40h pending

**Non-allowlist user**
- [ ] Doesn't see Personal Library in nav
- [ ] Direct URL to `/learn/personal-library` redirects to /
- [ ] Edge Functions return 403

---

## 13. Out of Scope (v1)

- HD voices (Sonia HD / Ryan HD upcharge)
- OCR for scanned PDFs
- Multi-language support beyond English text input
- Group chat / messaging within co-read
- Per-user timezone (everyone on Europe/London)
- Annual subscription / family plan / team plan
- Mobile native app
- Offline reading
- Streak freezes beyond the 3/month allowance
- User-curated public book submissions
- Voucher gifting / transferring rewards between users
- Public book audio download
- Resumable chunks (if user changes book, old progress is gone)

---

## 14. Build Order — Claude Code Task List

Execute in order. Each phase is PR-able.

### Phase A — Foundation (Week 1)
1. Add `pl_beta_access` flag to `user_profiles` (already done in Phase 2a)
2. Create all 13 new tables with RLS + indexes
3. Create all 7 Storage buckets with policies
4. Set up Supabase migration files in `database/`
5. Configure all env vars in Netlify + worker env

### Phase B — Stripe subscription plumbing (Week 1-2)
6. Configure Stripe product + price + webhook
7. `/personal-library-start-trial` Edge Function (Setup Intent + create sub)
8. `/personal-library-stripe-webhook` Edge Function (all 5 event types)
9. `/personal-library-cancel` Edge Function
10. Onboarding wizard frontend (4 steps)
11. `/account` page with sub status, cancel button, referral code

### Phase C — Public book library (Week 2-3)
12. Worker script to ingest public-domain PDFs from Project Gutenberg
13. Pre-generate audio for 25 starter books × 4 daily_minutes settings × Sonia voice = 100 cached variants
14. `public_books` + `public_book_audio_cache` populated
15. `/library` browse UI with filters
16. `/personal-library-select-public-book` Edge Function

### Phase D — User PDF upload pipeline (Week 3-4)
17. Worker: PDF parsing, chunking, language detection, scan detection
18. Worker: Azure TTS synthesis with retry
19. Worker: OpenAI vocab + sentence selection
20. Worker: chunk storage + DB writes
21. `/personal-library-upload-pdf` Edge Function
22. Upload UI

### Phase E — Daily dispatch + reading (Week 4-5)
23. Worker cron: 07:30 dispatch, 09:30 deadline check, 02:00 pre-gen
24. `/today` screen with all states (pre-dispatch / active / completed / Wednesday)
25. Audio player with autosave
26. Recording upload (full passage)
27. Sentence practice (reuse existing component)
28. `/personal-library-mark-complete` with all gating logic
29. Email templates: daily task, missed day, completion celebration

### Phase F — Freezes + book changes + rewards (Week 5)
30. `/personal-library-use-freeze` + UI
31. `/personal-library-change-book` + UI + cooldown enforcement
32. Worker cron: month rollover + Stripe coupon application
33. Reward banners + emails

### Phase G — Co-read (Week 5-6)
34. `/personal-library-create-coread-group` (public auto-approve, private to queue)
35. `/personal-library-join-coread`
36. `/personal-library-leave-coread`
37. `/personal-library-coread-disband-flow` (owner cancellation handling)
38. `/admin/personal-library/approvals` (Xiaoyu only)
39. `/coread/{group_id}` member-progress UI
40. SLA alerts (>40h pending)

### Phase H — Referrals (Week 6)
41. `user_referral_codes` auto-created on signup
42. Referral code field in onboarding
43. Webhook handler: on referred user's first paid invoice, apply £5 to referrer
44. `/account` referral section UI

### Phase I — Compliance + polish (Week 6-7)
45. UK compliance: trial-end banner (day 5), renewal reminder (7d), one-click cancel
46. All bilingual copy in i18n bundle
47. Empty states, error states for every endpoint
48. My Progress integration: PL pronunciation_attempts surface in dashboard
49. Recording 90-day purge cron + warning emails
50. End-to-end QA against §12 acceptance criteria

### Phase J — Soft launch (Week 7-8)
51. Internal testing with 3 test accounts (Xiaoyu + 2 trusted)
52. Stripe test mode → live mode switch
53. Open beta to 10 invited users via `pl_beta_access=true`
54. 1 week monitoring: dispatch success rate, TTS budget, approval queue SLA
55. Public launch: bulk-flip `pl_beta_access` for all subscribers, remove gate

---

## 15. Open Questions for Xiaoyu (decide before Phase A)

1. **Worker hosting**: Render or Railway? (default: Render)
2. **Public book starter set**: I'll propose 25 books from Project Gutenberg. Want approval before TTS generation? (~£5 one-time TTS spend for whole library × 4 daily_minute variants = £20)
3. **Onboarding voice**: should we record a 30-sec personal welcome from Xiaoyu in Mandarin for the welcome email? (1-time effort, big trust boost for Chinese users)
4. **Approval SLA enforcement**: if Xiaoyu can't approve within 48h (sick, travel), what's the fallback? (default: auto-extend SLA + send pushy notification, never auto-approve)
5. **Annual plan demand**: not in v1, but if you want, pricing would be £150/year (save £30). Decide post-launch based on user requests.

---

**End of spec.** Anything below this line is up to Claude Code's judgement within Readii's existing patterns. Engineering questions about ambiguity in this spec → ask before guessing.
