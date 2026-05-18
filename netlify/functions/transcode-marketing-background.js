// netlify/functions/transcode-marketing-background.js
// 把 marketing-videos bucket 中的 webm 用高质量参数转码成 mp4
// (跟 video-transcode-background 不同:不绑 pretotype_videos 表,质量优先 vs 速度优先)
//
// Body: { bucket, inputPath, outputPath }
// 例:  { bucket: 'marketing-videos', inputPath: 'apology-daisy.webm', outputPath: 'apology-daisy.mp4' }

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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { bucket, inputPath, outputPath } = JSON.parse(event.body || '{}');
    if (!bucket || !inputPath || !outputPath) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    console.log('🎞️ marketing transcode:', { bucket, inputPath, outputPath });

    // 下载 webm
    const { data: webmData, error: dlErr } = await supabase.storage
      .from(bucket)
      .download(inputPath);
    if (dlErr) {
      console.error('🎞️ download failed:', dlErr);
      return { statusCode: 500, body: JSON.stringify({ error: dlErr.message }) };
    }
    const webmBuf = Buffer.from(await webmData.arrayBuffer());
    console.log('🎞️ webm size:', webmBuf.length);

    // 写临时文件
    const tmpDir = os.tmpdir();
    const inFile = path.join(tmpDir, `mkt-in-${Date.now()}.webm`);
    const outFile = path.join(tmpDir, `mkt-out-${Date.now()}.mp4`);
    fs.writeFileSync(inFile, webmBuf);

    // High-quality transcode:保持 1080×1920,30fps,medium preset,crf 21,音频 192k
    const t0 = Date.now();
    await new Promise((resolve, reject) => {
      ffmpeg(inFile)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',             // 平衡:medium 在 Lambda 太慢(>5min),fast 是高质量档里的合理选
          '-crf 22',                  // 高质量(数字越低越好),22 vs 21 视觉几乎无差
          '-threads 0',               // 用满 Lambda 核心
          '-c:a aac',
          '-b:a 192k',                // 高音频码率
          '-ar 44100',
          '-pix_fmt yuv420p',         // iOS/通用兼容
          '-movflags +faststart',
          '-max_muxing_queue_size 2048'
        ])
        .output(outFile)
        .on('start', cmd => console.log('🎞️ ffmpeg cmd:', cmd))
        .on('progress', p => {
          if (p.percent) console.log('🎞️ progress:', Math.round(p.percent) + '%');
        })
        .on('end', () => {
          const ms = Date.now() - t0;
          console.log('🎞️ ffmpeg DONE in', (ms / 1000).toFixed(1), 's');
          resolve();
        })
        .on('error', err => {
          console.error('🎞️ ffmpeg FAILED:', err.message);
          reject(err);
        })
        .run();
    });

    const mp4Buf = fs.readFileSync(outFile);
    console.log('🎞️ mp4 size:', mp4Buf.length);

    // 上传 mp4(覆盖同名)
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(outputPath, mp4Buf, {
        contentType: 'video/mp4',
        upsert: true
      });
    if (upErr) {
      console.error('🎞️ upload failed:', upErr);
      return { statusCode: 500, body: JSON.stringify({ error: upErr.message }) };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(outputPath);
    console.log('🎞️ mp4 public URL:', urlData?.publicUrl);

    // cleanup
    try { fs.unlinkSync(inFile); } catch (e) {}
    try { fs.unlinkSync(outFile); } catch (e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, mp4Url: urlData?.publicUrl })
    };
  } catch (err) {
    console.error('🎞️ marketing transcode threw:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
