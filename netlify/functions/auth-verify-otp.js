// netlify/functions/auth-verify-otp.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const {
      email,
      otp,
      playerName,
      subscribeDaily,
      subscribeEdu
    } = JSON.parse(event.body);

    if (!email || !otp) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and OTP required' }) };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 查 user
    const { data: user, error: fetchError } = await supabase
      .from('readii_users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    // 检查 OTP 过期
    if (new Date(user.otp_expires_at) < new Date()) {
      return {
        statusCode: 410,
        body: JSON.stringify({ error: 'Code expired. Request a new one.' })
      };
    }

    // 检查尝试次数(防爆破)
    if (user.otp_attempts >= 5) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many attempts. Request a new code.' })
      };
    }

    // 校验 OTP
    if (user.current_otp !== otp.trim()) {
      // 失败,累加 attempts
      await supabase
        .from('readii_users')
        .update({ otp_attempts: user.otp_attempts + 1 })
        .eq('id', user.id);

      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid code. Please try again.' })
      };
    }

    // 验证成功:更新订阅 + 清 OTP
    const { data: updated, error: updateError } = await supabase
      .from('readii_users')
      .update({
        current_otp: null,
        otp_expires_at: null,
        otp_attempts: 0,
        last_login_at: new Date().toISOString(),
        player_name: playerName || user.player_name,
        subscribed_daily_readings: !!subscribeDaily,
        subscribed_edu_entrepreneurship: !!subscribeEdu
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Update failed' }) };
    }

    // 生成简单 session token(简化版,不做真实 JWT)
    const sessionToken = `${updated.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        user: {
          id: updated.id,
          email: updated.email,
          player_name: updated.player_name,
          subscribed_daily_readings: updated.subscribed_daily_readings,
          subscribed_edu_entrepreneurship: updated.subscribed_edu_entrepreneurship
        },
        sessionToken
      })
    };

  } catch (err) {
    console.error('verify-otp error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
