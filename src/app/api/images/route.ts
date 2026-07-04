import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const dir = join(process.cwd(), 'public', 'images', 'ayaka');
    const files = await readdir(dir);
    const images = files
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .sort()
      .map((filename, index) => ({
        id: index + 1,
        src: `/images/ayaka/${filename}`,
        title: `神里绫华 #${index + 1}`,
        category: guessCategory(filename),
      }));
    return Response.json({ images });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

function guessCategory(filename: string): string {
  const n = parseInt(filename.replace(/\D/g, ''), 10);
  if (n >= 4034000 && n < 4300000) return 'official';
  if (n >= 3862000 && n < 4034000) return 'fanart';
  return 'fanart';
}
