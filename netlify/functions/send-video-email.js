// netlify/functions/send-video-email.js
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
    const { videoId, userEmail } = JSON.parse(event.body);

    if (!videoId || !userEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId or email' }) };
    }

    // 查 video record
    const { data: video, error: fetchError } = await supabase
      .from('pretotype_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Video not found' }) };
    }

    // 查 user 拿 player_name
    const { data: user } = await supabase
      .from('readii_users')
      .select('player_name')
      .eq('email', userEmail.toLowerCase())
      .single();

    const playerName = user?.player_name || video.player_name || 'there';

    // 视频 URL(优先 mp4)
    const videoUrl = video.mp4_url || video.public_url;
    const isMP4 = !!video.mp4_url;

    // 落地页 URL
    const landingUrl = `https://readii.co.uk/v/${video.share_slug}`;

    // 发邮件
    const emailHTML = buildVideoReadyEmail({
      playerName,
      articleId: video.article_id,
      videoUrl,
      landingUrl,
      isMP4
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Readii <noreply@readii.co.uk>',
      to: userEmail,
      reply_to: 'xiaoyusu@readii.co.uk',
      subject: `Your reading is ready, ${playerName} ☕`,
      html: emailHTML
    });

    if (emailError) {
      console.error('Email send failed:', emailError);

      // 标记失败
      await supabase
        .from('pretotype_videos')
        .update({ email_status: 'failed' })
        .eq('id', videoId);

      return { statusCode: 500, body: JSON.stringify({ error: emailError.message }) };
    }

    // 标记成功
    await supabase
      .from('pretotype_videos')
      .update({
        email_sent_at: new Date().toISOString(),
        email_status: 'sent',
        user_email: userEmail.toLowerCase()
      })
      .eq('id', videoId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, sent_to: userEmail })
    };

  } catch (err) {
    console.error('send-video-email error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function buildVideoReadyEmail({ playerName, articleId, videoUrl, landingUrl, isMP4 }) {
  // 文章标题映射
  const articleTitles = {
    'apology': 'The Apology',
    'seven-novembers': 'Seven Novembers',
    'shop-closes-for-lunch': 'A Shop That Closes for Lunch'
  };
  const articleTitle = articleTitles[articleId] || 'a British reading';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; background: #FAF8F3; margin: 0; padding: 40px 20px; color: #1F4D40; }
  .container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
  .brand { font-family: 'Helvetica Neue', sans-serif; font-weight: 700; font-size: 28px; color: #B8873A; letter-spacing: 0.15em; text-align: center; margin-bottom: 8px; }
  .slogan { font-style: italic; font-size: 15px; color: #1F4D40; text-align: center; opacity: 0.7; margin-bottom: 24px; }
  .divider { height: 1px; background: #B8873A; opacity: 0.3; margin: 0 auto 32px; width: 60px; }

  .greeting { font-size: 18px; margin-bottom: 12px; }
  .body-text { font-size: 15px; line-height: 1.7; margin-bottom: 24px; }

  .reading-card { background: #1F4D40; color: #FAF8F3; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
  .reading-label { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; letter-spacing: 0.2em; color: #B8873A; margin-bottom: 8px; }
  .reading-title { font-family: Georgia, serif; font-style: italic; font-size: 24px; }

  .button { display: inline-block; background: #1F4D40; color: #FAF8F3 !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-family: 'Helvetica Neue', sans-serif; font-weight: 600; font-size: 15px; margin: 8px 0; }
  .button-primary { background: #B8873A; }

  .btn-row { text-align: center; margin: 24px 0; }

  .qr-section { background: #FAF8F3; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0; }
  .qr-label { font-size: 13px; opacity: 0.7; margin-bottom: 12px; }
  .qr-img { display: block; margin: 0 auto; width: 140px; height: 140px; }

  .footer-cta { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #E0DCD0; }
  .footer-cta a { color: #B8873A; text-decoration: none; font-weight: 600; }

  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #1F4D40; opacity: 0.5; line-height: 1.6; }
  .footer a { color: #1F4D40; opacity: 0.7; }
</style>
</head>
<body>
  <div class="container">
    <div class="brand">READII</div>
    <div class="slogan">Read British</div>
    <div class="divider"></div>

    <p class="greeting">Hello ${escapeHtml(playerName)},</p>

    <p class="body-text">
      Your reading is ready. Here's your video — keep it for yourself,
      or use it in your next reel.
    </p>

    <div class="reading-card">
      <div class="reading-label">YOUR READING OF</div>
      <div class="reading-title">${escapeHtml(articleTitle)}</div>
    </div>

    <div class="btn-row">
      <a href="${landingUrl}" class="button button-primary">
        ${isMP4 ? '📥 Download MP4' : '📥 Open my video'}
      </a>
    </div>

    <div class="qr-section">
      <div class="qr-label">📱 Or scan on your phone:</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(landingUrl)}"
           class="qr-img"
           alt="QR code" />
    </div>

    <p class="body-text" style="font-size: 14px; opacity: 0.8;">
      Tip: Open the link on your phone, then use any short-video editor
      (TikTok, Xiaohongshu, or Capcut) to clip a 15-30 second highlight.
    </p>

    <div class="footer-cta">
      <p style="margin: 0 0 8px; font-size: 14px;">Enjoyed this?</p>
      <a href="https://readii.co.uk/quiz">Try another reading →</a>
    </div>

    <div class="footer">
      Readii — British English reading studio<br>
      <a href="https://readii.co.uk">readii.co.uk</a>
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
