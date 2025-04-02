import { pgTable, varchar, text, vector, index } from 'drizzle-orm/pg-core';
import { nanoid } from "nanoid";

export const openAiEmbeddings = pgTable(
  'open_ai_embeddings',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  },
  (table) => ({
    openaiEmbeddingIndex: index('openai_embedding_index').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  })
);
