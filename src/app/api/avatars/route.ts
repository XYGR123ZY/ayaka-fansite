import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { NextRequest } from 'next/server';

const AVATARS_DIR = join(process.cwd(), 'public', 'avatars');
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
};

const AVATAR_PROMPTS = [
  'close-up portrait, gentle smile, soft lighting, white hair flowing, blue eyes, detailed face, bokeh background',
  'close-up portrait, looking slightly to the side, elegant expression, cherry blossom petals, warm sunlight',
  'close-up portrait, shy expression, looking down, white kimono collar visible, soft pink background',
  'close-up portrait, confident smile, wind blowing hair, ice crystals floating, cool blue tones',
  'close-up portrait, peaceful expression, eyes closed, moonlight, silver hair glowing',
  'close-up portrait, curious expression, head slightly tilted, modern casual clothes, warm indoor light',
  'close-up portrait, serious expression, determined eyes, snow falling, dramatic lighting',
  'close-up portrait, laughing, eyes sparkling, cherry blossom background, vibrant colors',
  'close-up portrait, thoughtful expression, hand on chin, sunset golden hour, warm tones',
  'close-up portrait, gentle eyes, slight blush, scarf around neck, winter atmosphere',
  'close-up portrait, elegant pose, hair ornament visible, traditional Japanese setting, soft light',
  'close-up portrait, surprised expression, wide eyes, cute, pastel color palette',
];

export async function GET(request: NextRequest) {
  try {
    if (!existsSync(AVATARS_DIR)) await mkdir(AVATARS_DIR, { recursive: true });
    const files = await readdir(AVATARS_DIR);
    const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    if (images.length === 0) {
      return new Response('No avatars generated yet. POST to /api/avatars to generate.', { status: 404 });
    }

    const exclude = request.nextUrl.searchParams.get('exclude') || '';
    let candidates = images.length > 1 ? images.filter(f => f !== exclude) : images;
    if (candidates.length === 0) candidates = images;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const buffer = await readFile(join(AVATARS_DIR, pick));
    const ext = extname(pick).toLowerCase();

    return new Response(buffer, {
      headers: {
        'Content-Type': MIME[ext] || 'image/png',
        'Cache-Control': 'no-store',
        'X-Filename': encodeURIComponent(pick),
      },
    });
  } catch (error: unknown) {
    return new Response(error instanceof Error ? error.message : 'Unknown error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max((body as { count?: number }).count || 6, 1), 12);

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'SILICONFLOW_API_KEY not configured' }, { status: 503 });
    }

    if (!existsSync(AVATARS_DIR)) await mkdir(AVATARS_DIR, { recursive: true });

    const base = '(masterpiece, best quality), kamisato ayaka, genshin impact, 1girl, ';
    const negative = 'low quality, bad anatomy, blurry, ugly, deformed, full body, wide shot';

    // Pick random prompts (no duplicates)
    const shuffled = [...AVATAR_PROMPTS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const results: { index: number; success: boolean; filename?: string; error?: string }[] = [];

    for (let i = 0; i < selected.length; i++) {
      const prompt = base + selected[i];
      try {
        const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'Kwai-Kolors/Kolors',
            prompt,
            negative_prompt: negative,
            image_size: '1024x1024',
            num_inference_steps: 30,
            guidance_scale: 7.5,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          results.push({ index: i, success: false, error: err });
          continue;
        }

        const data = await response.json();
        const url = data.images?.[0]?.url;
        if (!url) {
          results.push({ index: i, success: false, error: 'No image returned' });
          continue;
        }

        const imgRes = await fetch(url);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const filename = `avatar_${Date.now()}_${i}.png`;
        await writeFile(join(AVATARS_DIR, filename), buffer);
        results.push({ index: i, success: true, filename });
      } catch (err: unknown) {
        results.push({ index: i, success: false, error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return Response.json({
      message: `Generated ${successCount}/${count} avatars`,
      results,
      total: (await readdir(AVATARS_DIR)).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length,
    });
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
