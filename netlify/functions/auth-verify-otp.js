// netlify/functions/auth-verify-otp.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { email, otp } = JSON.parse(event.body);

    if (!email || !otp) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and OTP required' }) };
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: otpRecord, error: fetchError } = await supabase
      .from('quiz_otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !otpRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No OTP found. Request a new one.' }) };
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return { statusCode: 410, body: JSON.stringify({ error: 'Code expired. Request a new one.' }) };
    }

    if (otpRecord.attempts >= 5) {
      return { statusCode: 429, body: JSON.stringify({ error: 'Too many attempts.' }) };
    }

    if (otpRecord.otp !== otp.trim()) {
      await supabase
        .from('quiz_otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid code.' }) };
    }

    // 验证成功 — 注意:这里不创建用户,只确认 OTP 有效
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        email: normalizedEmail,
        playerName: otpRecord.player_name
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
