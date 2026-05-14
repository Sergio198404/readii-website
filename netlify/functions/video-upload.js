// netlify/functions/video-upload.js
// 接收浏览器上传的视频(base64)→ 存到 Supabase Storage → 写 pretotype_videos 表
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { sessionId, articleId, playerName, videoType, base64Data, fileName } = JSON.parse(event.body);

    if (!sessionId || !articleId || !videoType || !base64Data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    const sizeKb = Math.round(buffer.length / 1024);

    if (sizeKb > 50 * 1024) { // 50 MB limit
      return { statusCode: 413, body: JSON.stringify({ error: 'File too large' }) };
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeName = (playerName || 'reader').replace(/[^a-zA-Z0-9]/g, '');
    const storagePath = `${articleId}/${safeName}-${sessionId}-${videoType}-${timestamp}.webm`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-videos')
      .upload(storagePath, buffer, {
        contentType: 'video/webm',
        upsert: false
      });

    if (uploadError) {
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-videos')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Generate share slug
    const shareSlug = Math.random().toString(36).slice(2, 10);

    // Insert metadata to pretotype_videos table
    const { data: dbData, error: dbError } = await supabase
      .from('pretotype_videos')
      .insert({
        session_id: sessionId,
        article_id: articleId,
        player_name: playerName,
        video_type: videoType,
        storage_path: storagePath,
        public_url: publicUrl,
        size_kb: sizeKb,
        share_slug: shareSlug
      })
      .select()
      .single();

    if (dbError) {
      return { statusCode: 500, body: JSON.stringify({ error: dbError.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        publicUrl,
        shareSlug,
        videoId: dbData.id,
        storagePath
      })
    };

  } catch (err) {
    console.error('Upload error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
