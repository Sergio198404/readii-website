// netlify/functions/auth-send-otp.js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  try {
    const { email, playerName } = JSON.parse(event.body);

    if (!email || !email.includes('@')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required' }) };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeName = (playerName || '').trim().substring(0, 50);

    // Rate limit:同一邮箱 5 分钟内最多 3 次发送(防止邮件轰炸 / 资源耗尽)
    // 注:这里依赖"不删旧 OTP"——verify-otp 已改为取最新一条
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('quiz_otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', fiveMinAgo);

    if ((recentCount || 0) >= 3) {
      console.warn('🚫 OTP rate limit hit for', normalizedEmail, 'count=', recentCount);
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many requests. Please wait 5 minutes before trying again.' })
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 插新 OTP(不删旧的——verify 时取 created_at 最新的一条)
    const { error: insertError } = await supabase.from('quiz_otp_codes').insert({
      email: normalizedEmail,
      otp,
      expires_at: expiresAt.toISOString(),
      player_name: safeName || null
    });

    if (insertError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save OTP' }) };
    }

    // 发邮件
    const { error: emailError } = await resend.emails.send({
      from: 'Readii <noreply@readii.co.uk>',
      to: normalizedEmail,
      replyTo: 'xiaoyusu@readii.co.uk',
      subject: `Your Readii verification code: ${otp}`,
      html: buildOtpEmail(safeName || 'there', otp)
    });

    if (emailError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function buildOtpEmail(name, otp) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: Georgia, serif; background: #FAF8F3; margin: 0; padding: 40px 20px; color: #1F4D40; }
  .container { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px 32px; }
  .brand { font-family: 'Helvetica Neue', sans-serif; font-weight: 700; font-size: 24px; color: #B8873A; letter-spacing: 0.15em; text-align: center; margin-bottom: 8px; }
  .slogan { font-style: italic; font-size: 14px; opacity: 0.7; text-align: center; margin-bottom: 32px; }
  .divider { height: 1px; background: #B8873A; opacity: 0.3; margin: 0 auto 32px; width: 60px; }
  .otp-box { background: #1F4D40; color: #FAF8F3; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; }
  .note { font-size: 13px; opacity: 0.7; line-height: 1.6; }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; opacity: 0.5; }
</style></head><body>
<div class="container">
  <div class="brand">READII</div>
  <div class="slogan">Read British</div>
  <div class="divider"></div>
  <p>Hello ${escapeHtml(name)},</p>
  <p style="font-size: 14px; line-height: 1.6;">Use this code to confirm your email:</p>
  <div class="otp-box">${otp}</div>
  <p class="note">Expires in 30 minutes. If you didn't request this, ignore this email.</p>
  <div class="footer">Readii — readii.co.uk</div>
</div>
</body></html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
