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

    console.log('🔐 START:', {
      email: normalizedEmail,
      hasPassword: !!password,
      passwordLen: password?.length,
      hasSessionId: !!sessionId,
      hasAnonKey: !!SUPABASE_ANON_KEY
    });

    // 查邮箱是否已存在
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingUser = existingList?.users?.find(u => u.email === normalizedEmail);

    console.log('🔐 listUsers result:', {
      totalUsers: existingList?.users?.length,
      foundMatch: !!existingUser,
      existingUserId: existingUser?.id
    });

    let userId;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log('🔐 EXISTING USER path:', { userId });

      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          player_name: playerName || undefined,
          newsletter_daily_readings: !!subscribeDaily,
          newsletter_edu_entrepreneurship: !!subscribeEdu
        })
        .eq('id', userId)
        .select();

      console.log('🔐 update profile (existing):', {
        rowsAffected: updateData?.length,
        hasError: !!updateError,
        errorMsg: updateError?.message
      });

      // 让失败可见:existing user 的 UPDATE 应至少影响 1 行
      if (!updateData?.length) {
        return { statusCode: 500, body: JSON.stringify({
          error: 'User exists in auth but not in profile. Contact support.',
          debug: { userId, email: normalizedEmail }
        })};
      }

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

      console.log('🔐 admin.createUser result:', {
        success: !createError,
        newUserId: createData?.user?.id,
        error: createError?.message,
        errorStatus: createError?.status
      });

      if (createError) {
        return { statusCode: 500, body: JSON.stringify({ error: createError.message }) };
      }

      userId = createData.user.id;

      // 等 trigger 完成
      await new Promise(resolve => setTimeout(resolve, 400));

      // 检查 trigger 是否建好了 profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .eq('id', userId)
        .single();

      console.log('🔐 profile after trigger:', {
        profileExists: !!existingProfile,
        display_name: existingProfile?.display_name
      });

      // 让失败可见:trigger 应该已创建 profile
      if (!existingProfile) {
        return { statusCode: 500, body: JSON.stringify({
          error: 'Profile creation failed (trigger issue).',
          debug: { userId, email: normalizedEmail }
        })};
      }

      // 更新 newsletter + player_name
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          player_name: playerName || undefined,
          newsletter_daily_readings: !!subscribeDaily,
          newsletter_edu_entrepreneurship: !!subscribeEdu
        })
        .eq('id', userId)
        .select();

      console.log('🔐 update profile (new):', {
        rowsAffected: updateData?.length,
        hasError: !!updateError,
        errorMsg: updateError?.message
      });
    }

    // 关联视频到 user_id
    if (sessionId) {
      const { data: videoUpdateData } = await supabase
        .from('pretotype_videos')
        .update({ user_id: userId, user_email: normalizedEmail })
        .eq('session_id', sessionId)
        .select();

      console.log('🔐 attach video:', {
        rowsAffected: videoUpdateData?.length,
        sessionId
      });

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
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      console.log('🔐 signIn result:', {
        hasSession: !!signInData?.session,
        hasError: !!signInError,
        errorMsg: signInError?.message
      });

      if (signInData?.session) {
        session = {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at
        };
      }
    }

    console.log('🔐 RETURNING:', {
      isNewUser,
      hasSession: !!session,
      userId
    });

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
