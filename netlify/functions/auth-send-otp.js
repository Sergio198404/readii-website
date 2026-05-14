// netlify/functions/auth-send-otp.js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  try {
    const { email, playerName } = JSON.parse(event.body);

    // 基本验证
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid email required' })
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeName = (playerName || '').trim().substring(0, 50);

    // 生成 6 位 OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 分钟有效

    // upsert user(如果新用户创建,如果老用户更新)
    const { data: userData, error: upsertError } = await supabase
      .from('readii_users')
      .upsert({
        email: normalizedEmail,
        player_name: safeName || undefined,
        current_otp: otp,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('User upsert failed:', upsertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create user record' })
      };
    }

    // 发送 OTP 邮件
    const emailHTML = buildOtpEmail(safeName || 'there', otp);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Readii <noreply@readii.co.uk>',
      to: normalizedEmail,
      reply_to: 'xiaoyusu@readii.co.uk',
      subject: `Your Readii verification code: ${otp}`,
      html: emailHTML
    });

    if (emailError) {
      console.error('Email send failed:', emailError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send email' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'OTP sent to your email',
        userId: userData.id
      })
    };

  } catch (err) {
    console.error('send-otp error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function buildOtpEmail(name, otp) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; background: #FAF8F3; margin: 0; padding: 40px 20px; color: #1F4D40; }
  .container { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
  .brand { font-family: 'Helvetica Neue', sans-serif; font-weight: 700; font-size: 24px; color: #B8873A; letter-spacing: 0.15em; text-align: center; margin-bottom: 8px; }
  .slogan { font-style: italic; font-size: 14px; color: #1F4D40; text-align: center; opacity: 0.7; margin-bottom: 32px; }
  .divider { height: 1px; background: #B8873A; opacity: 0.3; margin: 0 auto 32px; width: 60px; }
  .greeting { font-size: 16px; margin-bottom: 16px; }
  .otp-box { background: #1F4D40; color: #FAF8F3; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; }
  .note { font-size: 13px; color: #1F4D40; opacity: 0.7; line-height: 1.6; }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #1F4D40; opacity: 0.5; }
</style>
</head>
<body>
  <div class="container">
    <div class="brand">READII</div>
    <div class="slogan">Read British</div>
    <div class="divider"></div>

    <p class="greeting">Hello ${escapeHtml(name)},</p>
    <p style="font-size: 14px; line-height: 1.6;">Use this code to confirm your email and receive your reading:</p>

    <div class="otp-box">${otp}</div>

    <p class="note">
      This code expires in 30 minutes.<br>
      If you didn't request this, please ignore this email.
    </p>

    <div class="footer">
      Readii — British English reading studio<br>
      readii.co.uk
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
