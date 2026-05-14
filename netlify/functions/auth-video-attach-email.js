// netlify/functions/auth-video-attach-email.js
// 验证 OTP 成功后,把 user_email 绑定到该 session 的视频记录;
// 若视频已转码完成则立即触发发信。
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { sessionId, email } = JSON.parse(event.body);

    if (!sessionId || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    // 更新这个 session 的所有 video records,设置 user_email
    const { data, error } = await supabase
      .from('pretotype_videos')
      .update({
        user_email: email.toLowerCase(),
        email_status: 'pending'
      })
      .eq('session_id', sessionId)
      .select();

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    // 如果有视频已经有 mp4_url,立刻触发邮件
    for (const video of data || []) {
      if (video.mp4_url && video.video_type === 'full') {
        try {
          await fetch(`https://readii.co.uk/.netlify/functions/send-video-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: video.id,
              userEmail: email.toLowerCase()
            })
          });
        } catch (e) {
          console.warn('Email trigger failed:', e);
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, attached: data?.length || 0 })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
