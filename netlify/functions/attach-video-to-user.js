// netlify/functions/attach-video-to-user.js
// 用 service_role 把 pretotype_videos 关联到 user(绕过表 RLS),
// 若已有 mp4 就绪的 full 视频则触发发信。
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { sessionId, userId, userEmail } = JSON.parse(event.body);

    if (!sessionId || !userId || !userEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    // UPDATE 视频(用 service_role,绕过 RLS)
    const { data, error } = await supabase
      .from('pretotype_videos')
      .update({
        user_id: userId,
        user_email: userEmail.toLowerCase()
      })
      .eq('session_id', sessionId)
      .select();

    if (error) {
      console.error('Attach failed:', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    // 如果有 mp4 已就绪的 full 视频,直接触发邮件(快路径)
    const fullVideo = (data || []).find(v => v.video_type === 'full');
    if (fullVideo && fullVideo.mp4_url) {
      try {
        await fetch(`${process.env.URL || 'https://readii.co.uk'}/.netlify/functions/send-video-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: fullVideo.id,
            userEmail: userEmail.toLowerCase()
          })
        });
      } catch (e) {
        console.warn('Email trigger failed:', e);
      }
    }

    // 双轨保证:无论 mp4_url 是否已就绪,都触发 transcode-background
    // transcode-background 自身幂等(early-return),完成后会通过 maybeTriggerEmail 发邮件
    if (fullVideo) {
      try {
        await fetch(`${process.env.URL || 'https://readii.co.uk'}/.netlify/functions/video-transcode-background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: fullVideo.id }),
          signal: AbortSignal.timeout(1500)
        });
        console.log('🔗 triggered transcode after attach for video', fullVideo.id);
      } catch (e) {
        console.warn('🔗 transcode trigger failed:', e.message);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        rowsAffected: data?.length || 0
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
