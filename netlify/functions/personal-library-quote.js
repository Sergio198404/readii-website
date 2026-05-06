// Netlify Function — Personal Library Quote (v2.7.0, Phase 2b)
//
// POST /.netlify/functions/personal-library-quote
//
// Headers:
//   Authorization: Bearer <user_jwt>     — required
//   Content-Type:  application/json
//
// Body:
//   { "book_id": "uuid-v4-string" }
//
// Precondition: PDF must already be uploaded to Supabase Storage at
//   user-pdfs/{user_id}/{book_id}/source.pdf
//
// Flow:
//   1. Verify JWT, extract user_id
//   2. Server-side allowlist guard: user_profiles.pl_beta_access must be true
//   3. Download PDF from storage (service role)
//   4. pdf-parse → text + metadata
//   5. Validations: size, pages, scanned-detection, language (franc)
//   6. Compute estimated audio seconds (READING_WPM=130) + tier + pricing for all 4 voices
//   7. Insert user_books row with status='pending_payment' and placeholder voice/minutes
//      (overwritten at checkout in Phase 3)
//   8. Return spec §7.1 response with full pricing preview

const { createClient } = require('@supabase/supabase-js');
// pdf-parse v1.1.1 has a debug block in its index.js that reads a test PDF
// on module load — fails in production. Require the inner file directly.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// franc v6+ is ESM-only. Lazy dynamic import + module-level cache so we
// only pay the import cost on cold start.
let _francModule = null;
async function detectLanguage(text) {
  if (!_francModule) _francModule = await import('franc');
  return _francModule.franc(text, { minLength: 100 });
}

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const READING_WPM           = parseInt(process.env.READING_WPM || '130', 10);
const MAX_PDF_BYTES         = parseInt(process.env.MAX_PDF_BYTES || '52428800', 10); // 50 MB
const MAX_PDF_PAGES         = parseInt(process.env.MAX_PDF_PAGES || '800', 10);
const MIN_CHARS_PER_PAGE    = 50; // below this, treat as scanned image PDF

const TIER_BASE_PENCE = { short: 800, medium: 1800, long: 3000, xlarge: 4500 };

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
function err(code, message, statusCode = 400) {
  return jsonResponse(statusCode, { error: { code, message } });
}
function priceTier(seconds) {
  if (seconds < 1800)  return 'short';
  if (seconds < 9000)  return 'medium';
  if (seconds < 18000) return 'long';
  return 'xlarge';
}
function priceFor(tier, voiceId) {
  const basePence = TIER_BASE_PENCE[tier];
  const isHd = voiceId.endsWith('-hd');
  const voicePremium = isHd ? Math.round(basePence * 0.5) : 0;
  return { basePence, voicePremium, total: basePence + voicePremium };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return err('CONFIG_MISSING', 'SUPABASE_URL or SUPABASE_SERVICE_KEY env var not set on Netlify', 500);
  }

  // ── 1. JWT validation ──────────────────────────────────────
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/);
  if (!m) return err('UNAUTHORIZED', 'Missing Authorization Bearer token', 401);
  const userJwt = m[1];

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(userJwt);
    if (error || !user) return err('UNAUTHORIZED', 'Invalid token', 401);
    userId = user.id;
  } catch (e) {
    return err('UNAUTHORIZED', 'Auth verification failed', 401);
  }

  // ── 2. Allowlist guard (server-side, non-bypassable) ──────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .select('pl_beta_access')
    .eq('id', userId)
    .maybeSingle();
  if (profileErr || !profile || !profile.pl_beta_access) {
    return err('NOT_AUTHORIZED', 'Personal Library is not available for your account', 403);
  }

  // ── 3. Body parsing ────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return err('INVALID_BODY', 'Body must be JSON'); }

  const bookId = body.book_id;
  if (!bookId || typeof bookId !== 'string' || !/^[0-9a-f-]{36}$/i.test(bookId)) {
    return err('INVALID_BOOK_ID', 'book_id must be a UUID');
  }

  // ── 4. Download PDF from storage ───────────────────────────
  const storagePath = `${userId}/${bookId}/source.pdf`;
  const { data: pdfBlob, error: dlErr } = await supabaseAdmin.storage
    .from('user-pdfs')
    .download(storagePath);
  if (dlErr || !pdfBlob) {
    return err('PDF_NOT_FOUND', `Could not read PDF: ${dlErr?.message || 'not found'}`, 404);
  }

  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
  if (pdfBuffer.byteLength > MAX_PDF_BYTES) {
    return err('PDF_TOO_LARGE', `PDF exceeds ${Math.floor(MAX_PDF_BYTES / 1048576)}MB limit`);
  }

  // ── 5. Parse PDF ──────────────────────────────────────────
  let parsed;
  try {
    parsed = await pdfParse(pdfBuffer);
  } catch (e) {
    return err('PDF_PARSE_FAILED', `Could not parse PDF: ${e.message}`);
  }
  const text = parsed.text || '';
  const totalPages = parsed.numpages || 0;
  if (totalPages === 0 || text.length === 0) {
    return err('PDF_PARSE_FAILED', 'PDF has no extractable text');
  }
  if (totalPages > MAX_PDF_PAGES) {
    return err('PDF_TOO_MANY_PAGES', `PDF has ${totalPages} pages; max is ${MAX_PDF_PAGES}`);
  }

  // ── 6. Scan detection ─────────────────────────────────────
  const avgCharsPerPage = text.length / totalPages;
  if (avgCharsPerPage < MIN_CHARS_PER_PAGE) {
    return err(
      'PDF_SCANNED',
      'This appears to be a scanned PDF. We do not yet support OCR — please try a text-based PDF.'
    );
  }

  // ── 7. Language detection ──────────────────────────────────
  // Sample first 5000 chars; sufficient accuracy and faster than full parse.
  const sample = text.length > 5000 ? text.slice(0, 5000) : text;
  let detectedLang;
  try {
    detectedLang = await detectLanguage(sample);
  } catch (e) {
    detectedLang = 'und'; // undetermined — let it through
  }
  // 'eng' = English, 'und' = undetermined (very short text). Reject anything else.
  if (detectedLang !== 'eng' && detectedLang !== 'und') {
    return err(
      'PDF_NOT_ENGLISH',
      `Detected language is "${detectedLang}". Personal Library currently supports English only.`
    );
  }

  // ── 8. Title + author from PDF metadata ───────────────────
  const info = parsed.info || {};
  let title = (info.Title || '').toString().trim();
  if (!title) title = 'Untitled book';
  if (title.length > 200) title = title.slice(0, 200);
  const author = ((info.Author || '').toString().trim()) || null;

  // ── 9. Reading-time estimate + tier + pricing ─────────────
  const totalWords = text.split(/\s+/).filter(Boolean).length;
  const estimatedAudioSeconds = Math.ceil((totalWords / READING_WPM) * 60);
  const tier = priceTier(estimatedAudioSeconds);

  const voices = ['sonia', 'ryan', 'sonia-hd', 'ryan-hd'];
  const byVoice = {};
  voices.forEach(v => {
    const p = priceFor(tier, v);
    byVoice[v] = { tier, total_pence: p.total };
  });

  // ── 10. Insert user_books row ─────────────────────────────
  // Schema requires voice_id / daily_minutes / total_days NOT NULL.
  // Use Sonia + 15 min as defaults; checkout overwrites them in Phase 3.
  const defaultVoice = 'sonia';
  const defaultMinutes = 15;
  const totalDays = Math.max(1, Math.ceil(totalWords / (defaultMinutes * READING_WPM)));
  const defaultPrice = priceFor(tier, defaultVoice);

  const { error: insertErr } = await supabaseAdmin
    .from('user_books')
    .insert({
      id: bookId,
      user_id: userId,
      title,
      author,
      source_pdf_path: storagePath,
      total_pages: totalPages,
      total_words: totalWords,
      estimated_audio_seconds: estimatedAudioSeconds,
      language_detected: 'en',
      voice_id: defaultVoice,
      daily_minutes: defaultMinutes,
      total_days: totalDays,
      tier,
      base_price_pence: defaultPrice.basePence,
      voice_premium_pence: 0,
      status: 'pending_payment',
    });
  if (insertErr && insertErr.code !== '23505') {
    // 23505 = unique violation (re-quote of same book_id). Treat as idempotent OK.
    return err('DB_INSERT_FAILED', `Could not save book: ${insertErr.message}`, 500);
  }

  // ── 11. Spec §7.1 response ─────────────────────────────────
  return jsonResponse(200, {
    book_id: bookId,
    title,
    author,
    total_pages: totalPages,
    total_words: totalWords,
    estimated_audio_seconds: estimatedAudioSeconds,
    language_detected: 'en',
    is_scanned: false,
    available_voices: [
      { id: 'sonia',    label: 'Sonia',    premium: false, preview_url: null },
      { id: 'ryan',     label: 'Ryan',     premium: false, preview_url: null },
      { id: 'sonia-hd', label: 'Sonia HD', premium: true,  preview_url: null },
      { id: 'ryan-hd',  label: 'Ryan HD',  premium: true,  preview_url: null },
    ],
    daily_minute_options: [5, 10, 15, 20, 30],
    pricing_preview: { by_voice: byVoice },
  });
};
