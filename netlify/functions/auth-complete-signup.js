// netlify/functions/auth-complete-signup.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { email, password, playerName, subscribeDaily, subscribeEdu, sessionId } = JSON.parse(event.body);

    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    if (password.length < 8) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 查邮箱是否已存在
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingUser = existingList?.users?.find(u => u.email === normalizedEmail);

    let userId;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;

      await supabase
        .from('user_profiles')
        .update({
          player_name: playerName || undefined,
          newsletter_daily_readings: !!subscribeDaily,
          newsletter_edu_entrepreneurship: !!subscribeEdu
        })
        .eq('id', userId);

    } else {
      isNewUser = true;

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: playerName || normalizedEmail.split('@')[0],
          signup_source: 'quiz'
        }
      });

      if (createError) {
        return { statusCode: 500, body: JSON.stringify({ error: createError.message }) };
      }

      userId = createData.user.id;

      // 等 trigger 完成
      await new Promise(resolve => setTimeout(resolve, 400));

      // 更新 newsletter + player_name
      await supabase
        .from('user_profiles')
        .update({
          player_name: playerName || undefined,
          newsletter_daily_readings: !!subscribeDaily,
          newsletter_edu_entrepreneurship: !!subscribeEdu
        })
        .eq('id', userId);
    }

    // 关联视频到 user_id
    if (sessionId) {
      await supabase
        .from('pretotype_videos')
        .update({ user_id: userId, user_email: normalizedEmail })
        .eq('session_id', sessionId);

      // 检查视频是否已转码完成,如果是立即触发邮件
      const { data: videos } = await supabase
        .from('pretotype_videos')
        .select('id, mp4_url')
        .eq('session_id', sessionId)
        .eq('video_type', 'full');

      for (const video of videos || []) {
        if (video.mp4_url) {
          try {
            await fetch(`${process.env.URL || 'https://readii.co.uk'}/.netlify/functions/send-video-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId: video.id, userEmail: normalizedEmail })
            });
          } catch (e) {
            console.warn('Email trigger failed:', e);
          }
        }
      }
    }

    // 清理 OTP
    await supabase.from('quiz_otp_codes').delete().eq('email', normalizedEmail);

    // 登录拿 session
    let session = null;
    if (SUPABASE_ANON_KEY) {
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: signInData } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (signInData?.session) {
        session = {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        userId,
        email: normalizedEmail,
        isNewUser,
        session
      })
    };

  } catch (err) {
    console.error('complete-signup error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
