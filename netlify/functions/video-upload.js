// netlify/functions/video-upload.js
// 浏览器已直传 Supabase Storage(绕过 Netlify 6MB body 限制),
// 此函数只负责把元数据写入 pretotype_videos 表 + 生成 share_slug。
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const {
      sessionId, articleId, playerName, videoType,
      storagePath, publicUrl, sizeKb
    } = JSON.parse(event.body);

    if (!sessionId || !articleId || !videoType || !storagePath || !publicUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Generate share slug
    const shareSlug = Math.random().toString(36).slice(2, 10);

    const { data, error } = await supabase
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

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        publicUrl,
        shareSlug,
        videoId: data.id,
        storagePath
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
