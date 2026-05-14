// netlify/functions/quiz-video-status.js
// 按 share_slug 查视频记录(含 mp4_url,用于轮询转码状态 + 分享落地页)
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  const slug = event.queryStringParameters?.slug;
  if (!slug) return { statusCode: 400, body: 'Missing slug' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('pretotype_videos')
    .select('public_url, mp4_url, player_name, article_id, video_type, share_slug')
    .eq('share_slug', slug)
    .single();

  if (error) return { statusCode: 404, body: 'Not found' };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
