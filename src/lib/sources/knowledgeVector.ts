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
    queryVector?: number[];
    topK: number;
    minScore?: number;
    includeVector?: boolean;
    filter: { knowledgeBaseId: string; retrievalVersion?: number };
  }): Promise<KnowledgeQueryResult[]>;
};

type PgQueryResult = { rows: Array<{ id: string; score: number | string; metadata: unknown }> };
type PgQueryable = { query(sql: string, values: unknown[]): Promise<PgQueryResult> };

export type KnowledgePgStore = PgVector & {
  queryKnowledgeRows(args: {
    indexName: string;
    knowledgeBaseId: string;
    retrievalVersion: number;
    topK: number;
    terms?: string[];
    ids?: string[];
  }): Promise<KnowledgeQueryResult[]>;
};

function knowledgeTable(indexName: string, knowledgeBaseId: string): string {
  if (!/^\d+$/.test(knowledgeBaseId) || indexName !== `knowledge_${knowledgeBaseId}`) {
    throw new Error('Knowledge index must match the server-owned numeric knowledge base');
  }
  return `"${KNOWLEDGE_VECTOR_SCHEMA}"."${indexName}"`;
}

export async function queryKnowledgeRows(
  pool: PgQueryable,
  args: Parameters<KnowledgePgStore['queryKnowledgeRows']>[0],
): Promise<KnowledgeQueryResult[]> {
  const table = knowledgeTable(args.indexName, args.knowledgeBaseId);
  const baseValues: unknown[] = [args.knowledgeBaseId, String(args.retrievalVersion)];
  let sql: string;
  let values: unknown[];
  if (args.ids) {
    sql = `SELECT vector_id AS id, 0::float8 AS score, metadata
      FROM ${table}
      WHERE metadata->>'knowledgeBaseId' = $1
        AND metadata->>'retrievalVersion' = $2
        AND vector_id = ANY($3::text[])
      ORDER BY array_position($3::text[], vector_id)
      LIMIT $4`;
    values = [...baseValues, args.ids, args.topK];
  } else {
    const weightedTerms = args.terms ?? [];
    sql = `WITH query_terms AS (
        SELECT term,
          CASE WHEN term ~ '[0-9]' OR char_length(term) >= 8 THEN 2.0 ELSE 1.0 END AS weight
        FROM unnest($3::text[]) AS term
      ), scored AS (
        SELECT vector_id AS id, metadata,
          COALESCE(sum(query_terms.weight) FILTER (
            WHERE lower(concat_ws(' ', metadata->>'headingPath', metadata->>'text'))
              ~ ('(^|[^[:alnum:]])' || regexp_replace(query_terms.term, '([\\.\\+\\*\\?\\[\\]\\(\\)\\{\\}\\^\\$\\|\\-])', '\\\\1', 'g') || '([^[:alnum:]]|$)')
          ), 0) / NULLIF(sum(query_terms.weight), 0) AS score
        FROM ${table}
        CROSS JOIN query_terms
        WHERE metadata->>'knowledgeBaseId' = $1
          AND metadata->>'retrievalVersion' = $2
        GROUP BY vector_id, metadata
      )
      SELECT id, score, metadata
      FROM scored
      WHERE score > 0
      ORDER BY score DESC, id
      LIMIT $4`;
    values = [...baseValues, weightedTerms, args.topK];
  }
  const result = await pool.query(sql, values);
  return result.rows.map((row) => ({
    id: row.id,
    score: Number(row.score),
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : undefined,
  }));
}

const g = globalThis as typeof globalThis & { __knowledgePgVector?: PgVector };

export function knowledgeVectorStore(): KnowledgePgStore {
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
  const store = g.__knowledgePgVector as PgVector & Partial<KnowledgePgStore>;
  if (!store.queryKnowledgeRows) {
    store.queryKnowledgeRows = (args) => queryKnowledgeRows(store.pool, args);
  }
  return store as KnowledgePgStore;
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
