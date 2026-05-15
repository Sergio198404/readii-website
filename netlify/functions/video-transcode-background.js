// netlify/functions/video-transcode.js
// 把 user-videos 里的 webm 用 ffmpeg 转成 mp4(iOS 相册兼容)
const { createClient } = require('@supabase/supabase-js');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  // === 🎬 诊断 ffmpeg 在 Lambda 环境是否可用 ===
  console.log('🎬 ffmpeg path:', ffmpegPath);
  console.log('🎬 ffmpeg exists:', fs.existsSync(ffmpegPath));

  const { spawnSync } = require('child_process');
  try {
    const result = spawnSync(ffmpegPath, ['-version'], { timeout: 5000 });
    console.log('🎬 ffmpeg version output:',
      result.stdout?.toString().split('\n')[0]);
    console.log('🎬 ffmpeg version exit code:', result.status);
  } catch (e) {
    console.error('🎬 ffmpeg spawn failed:', e.message);
  }
  // === 诊断结束 ===

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

    // === 🎬 诊断 webm 文件完整性 ===
    const stats = fs.statSync(inputPath);
    console.log('🎬 webmData blob size:', webmData.size, 'bytes');
    console.log('🎬 webmBuffer length:', webmBuffer.length, 'bytes');
    console.log('🎬 written file size:', stats.size, 'bytes');
    console.log('🎬 storage_path:', videoRecord.storage_path);

    // webm 文件应该以 EBML magic bytes (1a45dfa3) 开头
    const header = fs.readFileSync(inputPath).slice(0, 16);
    console.log('🎬 file header (hex):', header.toString('hex'));
    console.log('🎬 is valid webm:', header.slice(0, 4).toString('hex') === '1a45dfa3');
    // === 诊断结束 ===

    // Run ffmpeg with aggressive speed optimization
    // Goal: transcode within Netlify 26-second timeout
    const ffmpegStartTime = Date.now();

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([
          'scale=720:-2',  // 降到 720p(从 1080p)
          'fps=24'         // 限制 24 fps
        ])
        .outputOptions([
          '-c:v libx264',
          '-preset ultrafast',     // 最快预设
          '-crf 28',               // 质量稍降,文件更小
          '-tune zerolatency',     // 实时优化
          '-threads 0',            // 用所有 CPU 核心(0 = auto)
          '-c:a aac',
          '-b:a 96k',              // 音频码率降低
          '-ar 44100',             // 音频采样率
          '-movflags +faststart',  // mp4 优化
          '-pix_fmt yuv420p',
          '-max_muxing_queue_size 1024'  // 防止缓冲区问题
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('🎬 ffmpeg command:', cmd);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log('🎬 progress:', Math.round(progress.percent) + '%');
          }
        })
        .on('end', () => {
          const elapsed = ((Date.now() - ffmpegStartTime) / 1000).toFixed(1);
          console.log('🎬 ffmpeg DONE in', elapsed, 's');
          resolve();
        })
        .on('error', (err) => {
          const elapsed = ((Date.now() - ffmpegStartTime) / 1000).toFixed(1);
          console.error('🎬 ffmpeg FAILED after', elapsed, 's:', err.message);
          reject(err);
        })
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
