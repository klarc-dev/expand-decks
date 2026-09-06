import { fastembed } from '@mastra/fastembed';
import { PgVector } from '@mastra/pg';

import { DATABASE_URL } from '../env';

export const KNOWLEDGE_EMBEDDING_QUERY_MODEL_ID = 'multilingual-e5-large-query';
export const KNOWLEDGE_EMBEDDING_PASSAGE_MODEL_ID = 'multilingual-e5-large-passage';
export const KNOWLEDGE_EMBEDDING_DIMENSION = 1024;
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

// The provider already caches one MLE5Large session for both prefixes. Bound
// concurrent native runs as well as batch size; a failed run must not poison it.
let embeddingQueue: Promise<void> = Promise.resolve();
function serializeEmbedding<T>(run: () => PromiseLike<T>): Promise<T> {
  const result = embeddingQueue.then(run);
  embeddingQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function embedKnowledgeValues(values: string[]): Promise<number[][]> {
  // E5-large's native activation memory scales with batch size. The provider
  // defaults to 256; use singleton batches without changing model or prefixes.
  const embeddings: number[][] = [];
  for (const value of values) {
    const result = await serializeEmbedding(() =>
      fastembed.multilingualE5LargePassage.doEmbed({ values: [value] }),
    );
    embeddings.push(...result.embeddings);
  }
  return embeddings;
}

export async function embedKnowledgeQuery(query: string): Promise<number[]> {
  const result = await serializeEmbedding(() =>
    fastembed.multilingualE5LargeQuery.doEmbed({ values: [query] }),
  );
  const vector = result.embeddings[0];
  if (!vector || vector.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
    throw new Error(`Knowledge query embedding dimension must be ${KNOWLEDGE_EMBEDDING_DIMENSION}`);
  }
  return vector;
}
