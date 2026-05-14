// netlify/functions/video-transcode.js
// 把 user-videos 里的 webm 用 ffmpeg 转成 mp4(iOS 相册兼容)
const { createClient } = require('@supabase/supabase-js');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { videoId } = JSON.parse(event.body);
    if (!videoId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId' }) };
    }

    // Fetch video record
    const { data: videoRecord, error: fetchError } = await supabase
      .from('pretotype_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !videoRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Video not found' }) };
    }

    if (videoRecord.mp4_url) {
      // Already transcoded
      return { statusCode: 200, body: JSON.stringify({ alreadyDone: true, mp4Url: videoRecord.mp4_url }) };
    }

    // Download webm
    const { data: webmData, error: dlError } = await supabase.storage
      .from('user-videos')
      .download(videoRecord.storage_path);

    if (dlError) {
      return { statusCode: 500, body: JSON.stringify({ error: dlError.message }) };
    }

    const webmBuffer = Buffer.from(await webmData.arrayBuffer());

    // Write to temp file
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input-${videoId}.webm`);
    const outputPath = path.join(tmpDir, `output-${videoId}.mp4`);

    fs.writeFileSync(inputPath, webmBuffer);

    // Run ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const mp4Buffer = fs.readFileSync(outputPath);

    // Upload mp4
    const mp4Path = videoRecord.storage_path.replace(/\.webm$/, '.mp4');
    const { error: uploadError } = await supabase.storage
      .from('user-videos')
      .upload(mp4Path, mp4Buffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-videos')
      .getPublicUrl(mp4Path);

    const mp4PublicUrl = urlData.publicUrl;

    // Update DB
    await supabase
      .from('pretotype_videos')
      .update({ mp4_path: mp4Path, mp4_url: mp4PublicUrl })
      .eq('id', videoId);

    // v12: 转码完成后,如果已有用户邮箱且未发送,自动触发邮件
    const { data: updatedVideo } = await supabase
      .from('pretotype_videos')
      .select('user_email, email_status')
      .eq('id', videoId)
      .single();

    if (updatedVideo?.user_email && updatedVideo?.email_status !== 'sent') {
      try {
        await fetch(`https://readii.co.uk/.netlify/functions/send-video-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: videoId,
            userEmail: updatedVideo.user_email
          })
        });
      } catch (e) {
        console.warn('Auto-email trigger failed:', e);
      }
    }

    // Cleanup temp files
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        mp4Url: mp4PublicUrl
      })
    };

  } catch (err) {
    console.error('Transcode error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
