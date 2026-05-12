// netlify/functions/quiz-challenge.js
// POST: save a challenge (text + cards + score) → return slug
// GET:  load a challenge by slug → return data

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  // GET: load challenge
  if (event.httpMethod === 'GET') {
    const slug = event.queryStringParameters?.slug;
    if (!slug) return respond(400, { error: 'slug required' });

    const { data, error } = await supabase
      .from('pretotype_challenges')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return respond(404, { error: 'Challenge not found' });
    }

    // Also get attempts for leaderboard
    const { data: attempts } = await supabase
      .from('pretotype_attempts')
      .select('session_id, score, created_at')
      .eq('challenge_id', data.id)
      .eq('completed', true)
      .order('score', { ascending: false })
      .limit(10);

    return respond(200, {
      ...data,
      leaderboard: attempts || [],
      participant_count: attempts?.length || 0,
    });
  }

  // POST: save challenge
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return respond(400, { error: 'Invalid JSON' });
    }

    const { source_text, cards_json, creator_score, creator_name } = body;
    if (!source_text || !cards_json) {
      return respond(400, { error: 'source_text and cards_json required' });
    }

    // Generate short slug (6 chars)
    const slug = generateSlug();

    const { data, error } = await supabase
      .from('pretotype_challenges')
      .insert({
        slug,
        source_text: source_text.slice(0, 2000),
        cards_json,
        creator_score: creator_score || 0,
        creator_name: (creator_name || '匿名').slice(0, 30),
      })
      .select('id, slug')
      .single();

    if (error) {
      console.error('Insert error:', error);
      return respond(500, { error: 'Could not save challenge' });
    }

    return respond(200, {
      challenge_id: data.id,
      slug: data.slug,
      url: `${getBaseUrl(event)}/quiz?c=${data.slug}`,
    });
  }

  return respond(405, { error: 'Method not allowed' });
};

function generateSlug() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // no confusing chars
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

function getBaseUrl(event) {
  const host = event.headers?.host || 'readii.vip';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

function respond(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
