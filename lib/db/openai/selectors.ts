import { db } from "@/lib/db";
import { openAiEmbeddings } from "./schema";
import { sql } from "drizzle-orm";

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
}

/**
 * 基于向量相似度搜索文档
 * @param embedding 查询向量
 * @param threshold 相似度阈值 (0-1)
 * @param limit 返回结果数量
 * @returns 按相似度排序的文档列表
 */
export async function searchSimilarDocuments(
  embedding: number[],
  threshold: number = 0.7,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    const embeddingStr = embedding.join(',');
    const results = await db
      .select({
        id: openAiEmbeddings.id,
        content: openAiEmbeddings.content,
        similarity: sql<number>`1 - ("embedding" <=> '[${sql.raw(embeddingStr)}]'::vector)`.as("similarity"),
      })
      .from(openAiEmbeddings)
      .where(
        sql`1 - ("embedding" <=> '[${sql.raw(embeddingStr)}]'::vector) >= ${threshold}`
      )
      .orderBy(sql`similarity DESC`)
      .limit(limit);

    return results;
  } catch (error) {
    console.error("Error searching similar documents:", error);
    throw new Error("Failed to search similar documents");
  }
}
