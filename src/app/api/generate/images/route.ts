import { NextRequest } from 'next/server';
import { getGeneratedImages, deleteGeneratedImage } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const images = await getGeneratedImages(1, 50);
    return Response.json({ images });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json() as { id: number };
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const localPath = await deleteGeneratedImage(id, 1);
    if (!localPath) return Response.json({ error: 'Not found' }, { status: 404 });

    try {
      await unlink(join(process.cwd(), 'public', localPath));
    } catch {
      // file may already be deleted
    }

    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
