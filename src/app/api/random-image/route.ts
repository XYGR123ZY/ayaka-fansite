import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { NextRequest } from 'next/server';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(request: NextRequest) {
  try {
    const dir = join(process.cwd(), 'image');
    const fileParam = request.nextUrl.searchParams.get('file');

    if (fileParam) {
      const filePath = join(dir, fileParam);
      const buffer = await readFile(filePath);
      const ext = extname(fileParam).toLowerCase();
      return new Response(buffer, {
        headers: { 'Content-Type': MIME[ext] || 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const files = await readdir(dir);
    const images = files.filter(f => {
      const ext = extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    });

    if (images.length === 0) {
      return new Response('No images found', { status: 404 });
    }

    const exclude = request.nextUrl.searchParams.get('exclude') || '';
    let candidates = images.length > 1 ? images.filter(f => f !== exclude) : images;
    if (candidates.length === 0) candidates = images;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const filePath = join(dir, pick);
    const buffer = await readFile(filePath);
    const ext = extname(pick).toLowerCase();
    const mime = MIME[ext] || 'image/png';

    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'no-store',
        'X-Filename': encodeURIComponent(pick),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}
