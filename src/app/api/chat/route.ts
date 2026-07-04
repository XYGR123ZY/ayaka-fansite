import { NextRequest } from 'next/server';
import { streamDeepSeekChat, deepSeekChat, ChatMessage } from '@/lib/deepseek';
import {
  ensureUser,
  ensureConversation,
  getRecentMessages,
  saveMessage,
  getCoreMemories,
  getMemorySummary,
  updateMemorySummary,
  compressOldMessages,
  getMessageCount,
} from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load system prompt once at module level
const SYSTEM_PROMPT = (() => {
  try {
    const raw = readFileSync(join(process.cwd(), 'prompt', 'ayaka-system.md'), 'utf-8');
    const match = raw.match(/```\n([\s\S]*?)```/);
    return match ? match[1].trim() : raw;
  } catch {
    return '你是神里绫华。你从提瓦特穿越到了现世。';
  }
})();

const DEFAULT_USER_ID = 1;

// GET — 加载历史消息，让前端和 AI 看到的上下文保持一致
export async function GET() {
  try {
    await ensureUser(DEFAULT_USER_ID);
    const conv = await ensureConversation(DEFAULT_USER_ID);
    const messages = await getRecentMessages(conv.id, 50);
    return Response.json({ messages });
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages: newMessages } = body as { messages: ChatMessage[] };

    if (!newMessages || !Array.isArray(newMessages)) {
      return Response.json({ error: 'Invalid messages' }, { status: 400 });
    }

    // Ensure default user and conversation exist
    await ensureUser(DEFAULT_USER_ID);
    const conversation = await ensureConversation(DEFAULT_USER_ID);

    // Build context
    const recentMessages = await getRecentMessages(conversation.id, 20);
    const contextMessages: ChatMessage[] = [];

    // System prompt
    let systemContent = SYSTEM_PROMPT;

    // Memory summary
    const memorySummary = await getMemorySummary(conversation.id);
    if (memorySummary) {
      systemContent += `\n\n【你记得关于这个人的事】\n${memorySummary}`;
    }

    // Core memories
    const coreMemories = await getCoreMemories(DEFAULT_USER_ID);
    if (coreMemories.length > 0) {
      const memoryText = coreMemories.map((m) => `[${m.category}] ${m.content}`).join('\n');
      systemContent += `\n\n【你永远记得的事】\n${memoryText}`;
    }

    contextMessages.push({ role: 'system', content: systemContent });

    // DB history
    for (const msg of recentMessages) {
      contextMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    // New user message
    const userMessage = newMessages[newMessages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return Response.json({ error: 'Last message must be from user' }, { status: 400 });
    }
    contextMessages.push(userMessage);

    // Save user message
    await saveMessage(conversation.id, 'user', userMessage.content);

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          await streamDeepSeekChat(
            contextMessages,
            (chunk: string) => {
              fullResponse += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            },
            request.signal
          );

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

          // Save assistant response
          if (fullResponse) {
            await saveMessage(conversation.id, 'assistant', fullResponse);

            // Memory compression check
            const count = await getMessageCount(conversation.id);
            if (count > 30) {
              const oldMsgs = await compressOldMessages(conversation.id, 10);
              if (oldMsgs.length > 0) {
                const summary = await deepSeekChat([
                  {
                    role: 'system',
                    content: '将以下对话压缩为200字以内的摘要，保留用户的重要信息、绫华的情感反应和关键事件。用中文。',
                  },
                  {
                    role: 'user',
                    content: oldMsgs.map((m) => `${m.role}: ${m.content}`).join('\n'),
                  },
                ]);

                const existing = await getMemorySummary(conversation.id);
                const combined = existing ? `${existing}\n---\n${summary}` : summary;
                await updateMemorySummary(conversation.id, combined);
              }
            }
          }
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
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
  } catch (error: any) {
    console.error('Chat API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
