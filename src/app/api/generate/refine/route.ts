import { NextRequest } from 'next/server';
import { streamDeepSeekChat, ChatMessage } from '@/lib/deepseek';

const REFINE_SYSTEM_PROMPT = `你是绫华粉丝站的图片精修助手。用户已经生成了一张图片，现在想要做细微调整。

你的工作流程：
1. 询问用户想修改什么（例如：表情、光线、背景、服装细节、姿势等）
2. 基于用户的原始提示词和修改要求，生成一个精修后的英文提示词
3. 精修提示词应该保持原图的整体构图和风格，只修改用户提到的部分

规则：
- 每次只问一个修改点
- 最终提示词以 [REFINE_PROMPT] 开头
- 精修提示词要保留原图的核心描述，只调整用户要求的部分
- 在提示词末尾添加: (keep original composition, subtle changes, high fidelity)
- 用中文和用户沟通`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid messages' }, { status: 400 });
    }

    const contextMessages: ChatMessage[] = [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
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
    console.error('Refine assistant error:', error);
    return Response.json({ error: message }, { status: 500 });
  }
}
