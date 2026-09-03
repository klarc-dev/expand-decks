import { fastembed } from '@mastra/fastembed';
import { PgVector } from '@mastra/pg';

import { DATABASE_URL } from '../env';

export const KNOWLEDGE_EMBEDDING_DIMENSION = 384;
const KNOWLEDGE_VECTOR_SCHEMA = 'mastra_vectors';

export type KnowledgeQueryResult = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type KnowledgeVectorStore = {
  query(args: {
    indexName: string;
    queryVector: number[];
    topK: number;
    minScore: number;
    filter: { knowledgeBaseId: string };
  }): Promise<KnowledgeQueryResult[]>;
};

const g = globalThis as typeof globalThis & { __knowledgePgVector?: PgVector };

export function knowledgeVectorStore(): PgVector {
  if (!g.__knowledgePgVector) {
    g.__knowledgePgVector = new PgVector({
      id: 'knowledge-pg-vector',
      connectionString: DATABASE_URL,
      schemaName: KNOWLEDGE_VECTOR_SCHEMA,
      max: 5,
      // Payload migrations own the extension/schema. Per-base tables remain
      // dynamic, so createIndex must not be disabled for the ingestion path.
      disableInit: false,
    });
  }
  return g.__knowledgePgVector;
}

export async function embedKnowledgeValues(values: string[]): Promise<number[][]> {
  const result = await fastembed.doEmbed({ values });
  return result.embeddings;
}

export async function embedKnowledgeQuery(query: string): Promise<number[]> {
  const vector = (await embedKnowledgeValues([query]))[0];
  if (!vector || vector.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
    throw new Error(`Knowledge query embedding dimension must be ${KNOWLEDGE_EMBEDDING_DIMENSION}`);
  }
  return vector;
}
