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

    // 取最新一条 OTP(send-otp 不再 delete 旧的,可能有多行)
    const { data: otpRecord, error: fetchError } = await supabase
      .from('quiz_otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

    // OTP 验证通过——检查邮箱是否已注册(避免"密码静默失败"陷阱)
    const { data: usersList } = await supabase.auth.admin.listUsers();
    const existingUser = usersList?.users?.find(u => u.email === normalizedEmail);

    if (existingUser) {
      console.log('🔁 OTP verified for EXISTING user:', existingUser.id);
      // 已注册用户:前端会跳过密码屏,直接调 attachVideoToUser 完成关联
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          userExists: true,
          userId: existingUser.id,
          email: normalizedEmail,
          playerName: otpRecord.player_name
        })
      };
    }

    // 新用户:前端继续走设置密码屏
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        userExists: false,
        email: normalizedEmail,
        playerName: otpRecord.player_name
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
