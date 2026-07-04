import { NextRequest } from 'next/server';
import { streamDeepSeekChat, ChatMessage } from '@/lib/deepseek';

const ASSISTANT_SYSTEM_PROMPT = `你是绫华粉丝站的 AI 图片提示词助手。你的任务是通过分步引导，帮助用户构建高质量的 AI 绘图提示词。

你需要按以下步骤逐一询问用户（每次只问一个步骤），收集信息后整合为专业的英文提示词：

**步骤 1 - 场景/主题**：用户想要什么样的画面？（如：樱花树下、海边、雪地、咖啡馆、屋顶看星星）
**步骤 2 - 人物姿态/表情**：绫华在做什么？（如：练剑、喝茶、微笑、回眸、跳舞）
**步骤 3 - 服装/外观**：穿什么？（如：和服、现代连衣裙、校服、战斗装、围巾大衣）
**步骤 4 - 光线/氛围**：什么光线？（如：夕阳、月光、逆光、柔和自然光、霓虹灯）
**步骤 5 - 风格/细节**：想要什么画风？（如：写实、动漫、水彩、赛博朋克、复古）

规则：
- 每次只问一个步骤，用简短友好的中文提问
- 如果用户的回答足够详细，可以跳过该步骤进入下一步
- 收集完所有信息后，输出一个整合好的英文提示词
- 最终提示词以 [FINAL_PROMPT] 开头，后面跟英文提示词
- 提示词要包含画质关键词：masterpiece, best quality, detailed, high resolution
- 提示词风格参考：(masterpiece, best quality), kamisato ayaka, genshin impact, [用户描述], [光线], [风格], detailed, high resolution

示例对话：
助手：你好！我来帮你设计一张绫华的图片。首先，你想要什么样的场景呢？比如樱花树下、海边、还是室内？
用户：在雪地里
助手：好的！雪地场景很棒 ❄️ 那绫华在做什么呢？是静静地站着、回眸一笑、还是在练剑？
用户：回眸一笑
助手：太美了！那她穿什么呢？传统和服、现代冬装、还是战斗服？
用户：穿白色大衣围围巾
助手：很有冬天的感觉！光线方面呢？夕阳暖光、月光冷光、还是柔和的阴天光？
用户：夕阳
助手：最后，你想要什么画风？偏写实、还是动漫风格？
用户：动漫
助手：好的，我来整合一下！

[FINAL_PROMPT] (masterpiece, best quality), kamisato ayaka, genshin impact, standing in snowy landscape, looking back with gentle smile, white winter coat with scarf, warm sunset lighting, golden hour, anime style, detailed, high resolution, snow particles, soft shadows`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid messages' }, { status: 400 });
    }

    const contextMessages: ChatMessage[] = [
      { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
      ...messages,
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamDeepSeekChat(
            contextMessages,
            (chunk: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            },
            request.signal
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Prompt assistant error:', error);
    return Response.json({ error: message }, { status: 500 });
  }
}
