// netlify/functions/transcribe-audio.js
// Backend STT via OpenAI Whisper — replaces Web Speech API for cross-browser reliability
// (iOS WebKit's SpeechRecognition silent-fails on 2nd attempt)
//
// Required env var: OPENAI_API_KEY
//
// Request body: { audio: base64-string, mimeType: 'audio/webm' }
// Response: { transcript: string }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('🎙️ OPENAI_API_KEY not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'STT not configured (missing OPENAI_API_KEY)' })
    };
  }

  try {
    const { audio, mimeType } = JSON.parse(event.body || '{}');
    if (!audio) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing audio' }) };
    }

    const buffer = Buffer.from(audio, 'base64');
    if (buffer.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty audio buffer' }) };
    }

    console.log('🎙️ transcribe-audio:', { bytes: buffer.length, mimeType });

    // Node 18+ on Netlify: built-in fetch / Blob / FormData
    const fileBlob = new Blob([buffer], { type: mimeType || 'audio/webm' });
    const formData = new FormData();
    formData.append('file', fileBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    // Hint to Whisper:expect single English word / short phrase
    formData.append('prompt', 'A single English word read by a learner.');

    const t0 = Date.now();
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    });
    const ms = Date.now() - t0;

    if (!response.ok) {
      const errText = await response.text();
      console.error('🎙️ Whisper error:', response.status, errText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Whisper ${response.status}: ${errText.slice(0, 200)}` })
      };
    }

    const data = await response.json();
    const transcript = (data.text || '').trim();

    console.log('🎙️ Whisper OK in', ms, 'ms ->', JSON.stringify(transcript));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, ms })
    };
  } catch (err) {
    console.error('🎙️ transcribe-audio threw:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
