import { env } from '@/lib/env.mjs';
import OpenAI from 'openai';

// 定义返回结果的接口
interface EmbeddingResult {
  text: string;
  embedding: number[];
}

// 定义错误类型
export class EmbeddingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'EmbeddingError';
  }
}
// 初始化 OpenAI/embeddingAI 客户端
const embeddingAI = new OpenAI({
  apiKey: env.AI_KEY || '',
  baseURL: env.AI_BASE_URL || '',
})
/**
 * 将文本转换为向量嵌入
 * @param text 输入文本
 * @param options 配置选项
 * @returns 包含文本和对应向量的数组
 * @throws {EmbeddingError} 当处理过程中发生错误时
 */
export async function generateEmbeddings(
  text: string,
  options: {
    apiKey?: string;
    delimiter?: string;
    model?: string;
  }
): Promise<EmbeddingResult[]> {
  try {
    const {
      apiKey = env.AI_KEY || '',
      delimiter = '-------split line-------',
      model = env.EMBEDDING
    } = options;

    if (!apiKey) {
      throw new EmbeddingError('API key is required but not provided');
    }

    

    // 按分隔符分割文本
    const textChunks = text
      .split(delimiter)
      .filter(chunk => chunk.trim().length > 0);

    if (textChunks.length === 0) {
      throw new EmbeddingError('No valid text chunks found after splitting');
    }

    // 处理所有文本块
    try {
      const response = await embeddingAI.embeddings.create({
        model,
        input: textChunks,
        encoding_format: 'float'
      });

      // 将结果转换为指定格式
      return textChunks.map((text, index) => ({
        text,
        embedding: response.data[index].embedding
      }));
    } catch (apiError: any) {
      throw new EmbeddingError(
        'Error while generating embeddings',
        {
          message: apiError.message,
          status: apiError.status,
          type: apiError.type
        }
      );
    }
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }
    throw new EmbeddingError('Unexpected error during embedding generation', error);
  }
}
