import { env } from "@/lib/env.mjs";
import { generateEmbeddings } from "./embedding";
import fs from "fs";
// 其实就是保存
import { createEmbeddings } from "@/lib/db/openai/actions";

export async function embedDocs() {
  // 根目录下运行
  const docs = fs.readFileSync('./ai-docs/basic-components.txt', 'utf-8');

  const embeddings = await generateEmbeddings(docs, {
    apiKey: env.AI_KEY,
    model: env.EMBEDDING,
  });
  console.log('embedding done');
  await createEmbeddings(
    embeddings.map(embedding => ({
      embedding: embedding.embedding,
      content: embedding.text
    }))
  )
  console.log('save embeddings done');

  return embeddings;
}
embedDocs()