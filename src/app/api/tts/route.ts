import { NextRequest } from 'next/server';

// Edge TTS — Microsoft's free public API, no key needed
const EDGE_TTS_URL =
  'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

// Warm, gentle female Chinese voice — fits Ayaka's personality
const VOICE_NAME = 'zh-CN-XiaoxiaoNeural';

function buildSSML(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `
<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
  <voice name='${VOICE_NAME}'>
    <prosody rate='0.95' pitch='+5%'>
      ${escaped}
    </prosody>
  </voice>
</speak>`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text: string };
    if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

    const ssml = buildSSML(text.slice(0, 500));
    const ttsRes = await fetch(EDGE_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: ssml,
    });

    if (!ttsRes.ok) {
      return Response.json({ error: `TTS unavailable (${ttsRes.status})` }, { status: 502 });
    }

    return new Response(await ttsRes.arrayBuffer(), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
