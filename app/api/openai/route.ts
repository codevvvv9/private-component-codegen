import { OpenAI } from 'openai';
import { retrieveEmbedding } from './embedding';
import { getSystemPrompt } from '@/lib/prompt';
import { env } from '@/lib/env.mjs';
import { OpenAIRequest } from './types';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: env.AI_KEY || '',
  baseURL: env.AI_BASE_URL || '',
});

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as OpenAIRequest;

    const lastMessage = message[message.length - 1];
    const lastMessageContent = lastMessage.content as string;

    // 1. 获取最后一条消息进行相关内容检索
    const relevantDocs = await retrieveEmbedding(
      lastMessageContent,
      0.5, // 可能会影响检索的相关性，没有出来rag docs
      3
    );
    // reference
    const reference = relevantDocs.map(doc => doc.content).join('\n\n');
    const systemPrompt = getSystemPrompt(reference);

    // 2. 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 3. 创建对话补全请求
          const response = await openai.chat.completions.create({
            model: env.MODEL,
            stream: true,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...message,
            ],
            temperature: 0.7
          });

          // 4. 处理流式响应
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // 发送所有内容和relevantDocs
              const data = JSON.stringify({
                content,
                references: relevantDocs,
              })
              controller.enqueue(`data: ${data}\n\n`);
            }
          }
          controller.enqueue(`data: [DONE]\n\n`);
          controller.close();
        } catch (error) {
          console.error('Error processing stream:', error);
          controller.error(error);
        }
      },
    });

    // 5. 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 