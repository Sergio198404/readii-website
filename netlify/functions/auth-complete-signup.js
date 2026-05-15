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

    console.log('🔐 complete-signup START:', { email: normalizedEmail });

    // 检查邮箱是否已存在
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingUser = existingList?.users?.find(u => u.email === normalizedEmail);

    let userId;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log('🔐 EXISTING USER:', userId);

      // 查 user_profiles 是否真存在
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // 孤儿账号 — 补创建 profile
        console.log('🔧 Orphan user detected, inserting profile');

        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            display_name: playerName || normalizedEmail.split('@')[0],
            player_name: playerName,
            subscription_status: 'free',
            signup_source: 'quiz',
            newsletter_daily_readings: !!subscribeDaily,
            newsletter_edu_entrepreneurship: !!subscribeEdu
          });

        if (insertError) {
          console.error('Profile insert failed:', insertError);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create profile: ' + insertError.message })
          };
        }
      } else {
        // 正常 UPDATE
        const updates = {
          player_name: playerName || undefined,
          newsletter_daily_readings: !!subscribeDaily,
          newsletter_edu_entrepreneurship: !!subscribeEdu
        };
        // 只在 display_name 为空时补设(不覆盖主站老用户已有的)
        if (!existingProfile.display_name && playerName) {
          updates.display_name = playerName;
        }

        const { data: updateData, error: updateError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('Profile update failed:', updateError);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update profile: ' + updateError.message })
          };
        }

        if (!updateData?.length) {
          console.error('Update affected 0 rows for existing user — should not happen');
        }
      }

    } else {
      // 新用户
      isNewUser = true;
      console.log('🔐 NEW USER, creating auth user');

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
        console.error('createUser failed:', createError);
        return { statusCode: 500, body: JSON.stringify({ error: createError.message }) };
      }

      userId = createData.user.id;
      console.log('🔐 auth user created:', userId);

      // 等 trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证 trigger 是否工作
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        // trigger 失败 — explicit INSERT
        console.warn('🔧 Trigger did not create profile, inserting manually');

        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            display_name: playerName || normalizedEmail.split('@')[0],
            player_name: playerName,
            subscription_status: 'free',
            signup_source: 'quiz',
            newsletter_daily_readings: !!subscribeDaily,
            newsletter_edu_entrepreneurship: !!subscribeEdu
          });

        if (insertError) {
          console.error('Manual profile insert failed:', insertError);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Profile creation failed: ' + insertError.message })
          };
        }
      } else {
        console.log('🔐 trigger worked, updating profile');

        const updates = {
          player_name: playerName || undefined,
          newsletter_daily_readings: !!subscribeDaily,
          newsletter_edu_entrepreneurship: !!subscribeEdu
        };
        if (!profile.display_name && playerName) {
          updates.display_name = playerName;
        }

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.warn('Profile update after trigger failed (non-fatal):', updateError);
        }
      }
    }

    // 关联视频
    if (sessionId) {
      const { data: videoUpdate } = await supabase
        .from('pretotype_videos')
        .update({ user_id: userId, user_email: normalizedEmail })
        .eq('session_id', sessionId)
        .select();

      console.log('🔐 video attach:', { rowsAffected: videoUpdate?.length });

      // 检查 mp4 就绪的视频,触发邮件
      const { data: videos } = await supabase
        .from('pretotype_videos')
        .select('id, mp4_url')
        .eq('session_id', sessionId)
        .eq('video_type', 'full');

      for (const video of videos || []) {
        // 快路径:mp4 已就绪 → 直接发邮件
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

        // 双轨保证:无论是否有 mp4_url,都触发 transcode-background
        // transcode-background 自身幂等(early-return),完成后会通过 maybeTriggerEmail 发邮件
        try {
          await fetch(`${process.env.URL || 'https://readii.co.uk'}/.netlify/functions/video-transcode-background`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: video.id }),
            signal: AbortSignal.timeout(1500)
          });
          console.log('🔐 triggered transcode after signup for video', video.id);
        } catch (e) {
          console.warn('🔐 transcode trigger failed:', e.message);
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

      if (signInError) {
        console.warn('signIn failed (non-fatal):', signInError.message);
      } else if (signInData?.session) {
        session = {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at
        };
      }
    }

    console.log('🔐 SUCCESS:', { userId, isNewUser, hasSession: !!session });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, userId, email: normalizedEmail, isNewUser, session })
    };

  } catch (err) {
    console.error('🔐 CAUGHT ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
