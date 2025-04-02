"use server";

import { db } from "@/lib/db";
import { openAiEmbeddings } from "./schema";

export type CreateEmbeddingsInput = {
  embedding: number[];
  content: string;
}[];

export async function createEmbeddings(embeddings: CreateEmbeddingsInput) {
  try {
    const result = await db.insert(openAiEmbeddings).values(
      embeddings.map((item) => ({
        content: item.content,
        embedding: item.embedding,
      }))
    );
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating embeddings:", error);
    return { success: false, error: "Failed to create embeddings" };
  }
}
