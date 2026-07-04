import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { saveGeneratedImage } from '@/lib/db';

const AYAKA_BASE_PROMPT =
  '(masterpiece, best quality), kamisato ayaka, genshin impact, cryo vision, white hair, blue eyes, ponytail, hime cut, elegant kimono, snow particles, soft lighting';

const TEMPLATES: Record<string, { label: string; suffix: string }> = {
  portrait: { label: '人物肖像', suffix: 'portrait, close-up, detailed face, beautiful lighting, bokeh background' },
  fullbody: { label: '全身立绘', suffix: 'full body, standing, dynamic pose, detailed outfit, high quality' },
  scene: { label: '场景氛围', suffix: 'cinematic lighting, detailed environment, atmospheric, depth of field' },
  casual: { label: '日常便装', suffix: 'casual modern clothes, relaxed pose, warm lighting, cozy atmosphere' },
  battle: { label: '战斗姿态', suffix: 'action pose, cryo effects, ice crystals, dynamic lighting, epic' },
  sakura: { label: '樱花季节', suffix: 'cherry blossom, spring, petals falling, soft pink tones, serene' },
};

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1024x1024',
  '3:4': '768x1024',
  '4:3': '1024x768',
  '9:16': '720x1280',
  '16:9': '1280x720',
  '1:2': '720x1440',
};

interface ReferenceImages {
  character?: string;
  environment?: string;
  pose?: string;
  expression?: string;
  clothing?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      template,
      aspectRatio = '3:4',
      customSize,
      referenceImage,
      numImages = 1,
      steps = 25,
      guidanceScale = 7.5,
      seed,
      faceImage,
      mode = 'normal',
      refineImage,
      refineMode = false,
      refImages,
    } = body as {
      prompt: string;
      template?: string;
      aspectRatio?: string;
      customSize?: string;
      referenceImage?: string;
      numImages?: number;
      steps?: number;
      guidanceScale?: number;
      seed?: number;
      faceImage?: string;
      mode?: 'normal' | 'img2img' | 'instantid';
      refineImage?: string;
      refineMode?: boolean;
      refImages?: ReferenceImages;
    };

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: '请提供描述文字' }, { status: 400 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: '图片生成功能需要配置 SILICONFLOW_API_KEY，请在 .env 中添加' },
        { status: 503 }
      );
    }

    const templateSuffix = template && TEMPLATES[template] ? `, ${TEMPLATES[template].suffix}` : '';
    const fullPrompt = `${AYAKA_BASE_PROMPT}, ${prompt}${templateSuffix}`;
    const imageSize = customSize || ASPECT_RATIOS[aspectRatio] || '768x1024';

    let payload: Record<string, unknown>;
    let modelName: string;

    if (refineMode && refineImage) {
      // Refinement mode: high reference weight, subtle changes
      modelName = 'Qwen/Qwen-Image-Edit-2509';
      payload = {
        model: modelName,
        prompt: `(subtle refinement, keep original composition) ${fullPrompt}`,
        image: refineImage,
        num_inference_steps: Math.min(Math.max(steps, 15), 30),
        guidance_scale: Math.max(guidanceScale * 0.6, 2),
      };
      if (seed !== undefined && seed >= 0) payload.seed = seed;
    } else if (mode === 'instantid' && faceImage) {
      // Qwen Edit with face reference for character consistency
      modelName = 'Qwen/Qwen-Image-Edit-2509';
      payload = {
        model: modelName,
        prompt: fullPrompt,
        image: faceImage,
        num_inference_steps: Math.min(Math.max(steps, 20), 50),
        guidance_scale: Math.min(guidanceScale, 10),
      };
      if (seed !== undefined && seed >= 0) payload.seed = seed;
    } else {
      // Normal / img2img mode
      modelName = 'Kwai-Kolors/Kolors';
      payload = {
        model: modelName,
        prompt: fullPrompt,
        negative_prompt: 'low quality, bad anatomy, worst quality, blurry, ugly, deformed, disfigured, bad hands, extra fingers',
        image_size: imageSize,
        batch_size: Math.min(Math.max(numImages, 1), 4),
        num_inference_steps: Math.min(Math.max(steps, 15), 50),
        guidance_scale: guidanceScale,
      };
      if (seed !== undefined && seed >= 0) payload.seed = seed;

      // Determine the best reference image to use
      const mainRef = resolveMainReference(refImages, referenceImage);
      if (mainRef) {
        payload.image = mainRef;
      }
    }

    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SiliconFlow API error: ${response.status} ${errText}`);
    }

    const data = await response.json();

    if (!data.images || data.images.length === 0) {
      throw new Error('未返回图片，请稍后重试');
    }

    const generatedDir = join(process.cwd(), 'public', 'generated');
    if (!existsSync(generatedDir)) {
      await mkdir(generatedDir, { recursive: true });
    }

    const savedImages: string[] = [];

    for (const img of data.images) {
      const url = img.url as string;
      const filename = `ayaka_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
      const localPath = `/generated/${filename}`;
      const filePath = join(generatedDir, filename);

      try {
        const imgResponse = await fetch(url);
        const buffer = Buffer.from(await imgResponse.arrayBuffer());
        await writeFile(filePath, buffer);

        await saveGeneratedImage({
          prompt: prompt,
          model: modelName,
          imageSize,
          localPath,
          originalUrl: url,
          referenceImage: (referenceImage || faceImage || refineImage) ? '[ref]' : undefined,
          template: template || undefined,
        });

        savedImages.push(localPath);
      } catch (err) {
        console.error('Failed to save image:', err);
        savedImages.push(url);
      }
    }

    return Response.json({ images: savedImages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate API error:', error);
    return Response.json({ error: message }, { status: 500 });
  }
}

function resolveMainReference(refImages?: ReferenceImages, fallback?: string): string | undefined {
  if (!refImages) return fallback || undefined;
  // Priority: character > environment > fallback
  return refImages.character || refImages.environment || fallback || undefined;
}
