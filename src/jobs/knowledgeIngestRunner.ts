import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { fastembed } from '@mastra/fastembed';
import { PgVector } from '@mastra/pg';
import { MDocument } from '@mastra/rag';
import mammoth from 'mammoth';
import type { Payload, PayloadRequest, TaskHandlerArgs } from 'payload';
import { extractText as extractPdfText } from 'unpdf';

import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { DATABASE_URL } from '../lib/env';
import { KNOWLEDGE_DIR } from '../lib/paths';
import { INDEXING_STATUS } from '../lib/status';

const KNOWLEDGE_EMBEDDING_DIMENSION = 384;
const EMBEDDING_BATCH_SIZE = 256;
const CHUNK_MAX_SIZE = 1_200;
const CHUNK_OVERLAP = 150;
const ERROR_LIMIT = 5_000;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type DocumentRecord = {
  id: number | string;
  filename?: string | null;
  mimeType?: string | null;
  title?: string | null;
  sourceHash?: string | null;
  knowledgeBase?: number | string | { id: number | string } | null;
};

type ChunkMetadata = {
  knowledgeBaseId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  text: string;
};

type Extractor = (filePath: string, mimeType: string) => Promise<string>;
type Embedder = (values: string[]) => Promise<number[][]>;
type VectorStore = {
  createIndex(args: {
    indexName: string;
    dimension: number;
    metric?: 'cosine';
    metadataIndexes?: string[];
  }): Promise<void>;
  upsert(args: {
    indexName: string;
    vectors: number[][];
    metadata: ChunkMetadata[];
    ids: string[];
    deleteFilter?: { documentId: string };
  }): Promise<string[]>;
  deleteVectors(args: { indexName: string; filter: { documentId: string } }): Promise<void>;
  deleteIndex(args: { indexName: string }): Promise<void>;
};

type RunnerPayload = Pick<Payload, 'db' | 'find' | 'findByID' | 'logger' | 'update'>;

export type KnowledgeIngestDependencies = {
  extractText: Extractor;
  embed: Embedder;
  vectorStore: VectorStore;
  now: () => Date;
};

export type KnowledgeIngestTaskArgs = {
  input: unknown;
  req: { payload: RunnerPayload };
};

export function relationId(value: DocumentRecord['knowledgeBase']): number | string | undefined {
  if (value && typeof value === 'object') return value.id;
  return value ?? undefined;
}

export function knowledgeIndexName(knowledgeBaseId: number | string): string {
  const raw = String(knowledgeBaseId);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid numeric knowledge base id: "${raw}"`);
  }
  return `knowledge_${raw}`;
}

export function buildChunkMetadata(
  document: Pick<DocumentRecord, 'id' | 'title'>,
  knowledgeBaseId: number | string,
  chunks: string[],
): ChunkMetadata[] {
  return chunks.map((text, chunkIndex) => ({
    knowledgeBaseId: String(knowledgeBaseId),
    documentId: String(document.id),
    title: document.title?.trim() || 'Document sans titre',
    chunkIndex,
    text,
  }));
}

export async function extractKnowledgeText(filePath: string, mimeType: string): Promise<string> {
  const normalizedMime = mimeType.split(';')[0].trim();
  if (normalizedMime === 'text/plain' || normalizedMime === 'text/markdown') {
    return readFile(filePath, 'utf8');
  }
  if (normalizedMime === 'application/pdf') {
    const result = await extractPdfText(new Uint8Array(await readFile(filePath)), {
      mergePages: true,
    });
    return result.text;
  }
  if (normalizedMime === DOCX_MIME) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  throw new Error(`Unsupported knowledge document MIME type: ${mimeType}`);
}

async function chunkKnowledgeText(text: string, mimeType: string): Promise<string[]> {
  const isMarkdown = mimeType.split(';')[0].trim() === 'text/markdown';
  const document = isMarkdown ? MDocument.fromMarkdown(text) : MDocument.fromText(text);
  const chunks = await document.chunk({
    strategy: isMarkdown ? 'markdown' : 'recursive',
    maxSize: CHUNK_MAX_SIZE,
    overlap: CHUNK_OVERLAP,
  });
  return chunks.map((chunk) => chunk.text).filter((chunk) => chunk.trim().length > 0);
}

async function embedLocally(values: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let offset = 0; offset < values.length; offset += EMBEDDING_BATCH_SIZE) {
    const result = await fastembed.doEmbed({
      values: values.slice(offset, offset + EMBEDDING_BATCH_SIZE),
    });
    vectors.push(...result.embeddings);
  }
  return vectors;
}

const g = globalThis as typeof globalThis & { __knowledgePgVector?: PgVector };
export function getKnowledgeVectorStore(): VectorStore {
  if (!g.__knowledgePgVector) {
    g.__knowledgePgVector = new PgVector({
      id: 'knowledge-pg-vector',
      connectionString: DATABASE_URL,
      schemaName: 'mastra_vectors',
      max: 5,
      // Payload migrations own CREATE EXTENSION + CREATE SCHEMA. Per-base tables
      // are dynamic, however, and PgVector.createIndex is a silent no-op with
      // disableInit=true; this DDL-only vector instance therefore keeps init on.
      disableInit: false,
    });
  }
  return g.__knowledgePgVector;
}

async function patchDocument(
  payload: Pick<Payload, 'update'>,
  documentId: number | string,
  data: Record<string, unknown>,
  req?: Partial<PayloadRequest>,
) {
  return payload.update({
    collection: COLLECTIONS.knowledgeDocuments,
    id: documentId,
    data,
    overrideAccess: true,
    context: {
      ...(req?.context ?? {}),
      [CTX.skipIngestQueue]: true,
      [CTX.trustedKnowledgeLifecycle]: true,
    },
  });
}

export async function updateKnowledgeBaseSummary(
  payload: RunnerPayload,
  knowledgeBaseId: number | string,
  lastIndexedAt?: string,
): Promise<void> {
  const result = await payload.find({
    collection: COLLECTIONS.knowledgeDocuments,
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
    where: { knowledgeBase: { equals: knowledgeBaseId } },
  });
  const docs = result.docs as unknown as { chunkCount?: number | null; indexingStatus?: string }[];
  const indexed = docs.filter((doc) => doc.indexingStatus === INDEXING_STATUS.indexed);
  await payload.db.updateOne({
    collection: COLLECTIONS.knowledgeBases,
    id: knowledgeBaseId,
    data: {
      documentCount: docs.length,
      chunkCount: indexed.reduce((sum, doc) => sum + (doc.chunkCount ?? 0), 0),
      ...(lastIndexedAt ? { lastIndexedAt } : {}),
      updatedAt: null,
    },
    req: undefined,
  });
}

// fallow-ignore-next-line complexity -- task runner owns one linear transactional lifecycle
export async function runKnowledgeIngestTask(
  { input, req }: KnowledgeIngestTaskArgs,
  dependencies: Partial<KnowledgeIngestDependencies> = {},
) {
  const { documentId } = input as { documentId?: number | string };
  if (documentId === undefined || documentId === null || documentId === '') {
    throw new Error('Knowledge ingestion requires a documentId');
  }
  const deps: KnowledgeIngestDependencies = {
    extractText: dependencies.extractText ?? extractKnowledgeText,
    embed: dependencies.embed ?? embedLocally,
    vectorStore: dependencies.vectorStore ?? getKnowledgeVectorStore(),
    now: dependencies.now ?? (() => new Date()),
  };
  let knowledgeBaseId: number | string | undefined;

  try {
    const document = (await req.payload.findByID({
      collection: COLLECTIONS.knowledgeDocuments,
      id: documentId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as DocumentRecord;
    knowledgeBaseId = relationId(document.knowledgeBase);
    if (knowledgeBaseId === undefined) throw new Error('Document has no knowledge base');
    if (!document.filename) throw new Error('Document has no uploaded file');
    if (!document.mimeType) throw new Error('Document has no MIME type');

    await patchDocument(req.payload, documentId, {
      indexingStatus: INDEXING_STATUS.indexing,
      errorMessage: '',
      chunkCount: 0,
    });

    const indexName = knowledgeIndexName(knowledgeBaseId);
    await deps.vectorStore.createIndex({
      indexName,
      dimension: KNOWLEDGE_EMBEDDING_DIMENSION,
      metric: 'cosine',
      metadataIndexes: ['knowledgeBaseId', 'documentId'],
    });
    await deps.vectorStore.deleteVectors({
      indexName,
      filter: { documentId: String(documentId) },
    });
    await updateKnowledgeBaseSummary(req.payload, knowledgeBaseId);

    const filePath = join(KNOWLEDGE_DIR, document.filename);
    const source = await readFile(filePath);
    const sourceHash = createHash('sha256').update(source).digest('hex');
    const text = await deps.extractText(filePath, document.mimeType);
    if (!text.trim()) throw new Error('Aucun texte exploitable n’a été extrait du document.');

    const chunks = await chunkKnowledgeText(text, document.mimeType);
    if (chunks.length === 0) throw new Error('Le document n’a produit aucun fragment exploitable.');
    const vectors = await deps.embed(chunks);
    if (vectors.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: expected ${chunks.length}, received ${vectors.length}`,
      );
    }
    if (vectors.some((vector) => vector.length !== KNOWLEDGE_EMBEDDING_DIMENSION)) {
      throw new Error(`Embedding dimension must be ${KNOWLEDGE_EMBEDDING_DIMENSION}`);
    }

    const latest = (await req.payload.findByID({
      collection: COLLECTIONS.knowledgeDocuments,
      id: documentId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as DocumentRecord;
    const latestKnowledgeBaseId = relationId(latest.knowledgeBase);
    const latestSourceHash = createHash('sha256')
      .update(await readFile(filePath))
      .digest('hex');
    if (
      latest.filename !== document.filename ||
      latestSourceHash !== sourceHash ||
      latestKnowledgeBaseId !== knowledgeBaseId
    ) {
      req.payload.logger.info({ documentId }, 'knowledge ingest skipped stale document change');
      return { output: { success: false, chunkCount: 0 } };
    }

    const metadata = buildChunkMetadata(document, knowledgeBaseId, chunks);
    await deps.vectorStore.upsert({
      indexName,
      vectors,
      metadata,
      ids: chunks.map((_, index) => `${documentId}:${sourceHash}:${index}`),
      deleteFilter: { documentId: String(documentId) },
    });

    const now = deps.now();
    await patchDocument(req.payload, documentId, {
      indexingStatus: INDEXING_STATUS.indexed,
      errorMessage: '',
      chunkCount: chunks.length,
      sourceHash,
    });
    await updateKnowledgeBaseSummary(req.payload, knowledgeBaseId, now.toISOString());
    req.payload.logger.info(
      { documentId, knowledgeBaseId, chunkCount: chunks.length },
      'knowledge document indexed',
    );
    return { output: { success: true, chunkCount: chunks.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchDocument(req.payload, documentId, {
      indexingStatus: INDEXING_STATUS.failed,
      errorMessage: message.slice(0, ERROR_LIMIT),
      chunkCount: 0,
    });
    if (knowledgeBaseId !== undefined) {
      await updateKnowledgeBaseSummary(req.payload, knowledgeBaseId).catch((summaryError) =>
        req.payload.logger.warn(
          { err: summaryError, knowledgeBaseId },
          'knowledge base summary update failed',
        ),
      );
    }
    throw error;
  }
}
