import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { MDocument } from '@mastra/rag';
import mammoth from 'mammoth';
import type { Payload, PayloadRequest, TaskHandlerArgs } from 'payload';
import { extractText as extractPdfText } from 'unpdf';

import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { KNOWLEDGE_DIR } from '../lib/paths';
import { INDEXING_STATUS } from '../lib/status';
import {
  embedKnowledgeValues,
  KNOWLEDGE_EMBEDDING_DIMENSION,
  knowledgeVectorStore,
} from '../lib/sources/knowledgeVector';
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
  knowledgeBase?: number | string | { id: number | string } | null;
};

/**
 * Version of the indexed retrieval representation (chunking + embedding input).
 * Bump whenever chunk boundaries or embedded text change so previously indexed
 * documents are recognisably stale and can be reindexed.
 */
export const KNOWLEDGE_RETRIEVAL_VERSION = 3;

/**
 * A document indexed under an older representation cannot be compared against
 * one indexed under the current chunking/embedding scheme, so it must be
 * reindexed before its passages are trustworthy.
 */
export function needsReindex(indexedRetrievalVersion: number | null | undefined): boolean {
  return (indexedRetrievalVersion ?? 0) < KNOWLEDGE_RETRIEVAL_VERSION;
}

type KnowledgeChunk = {
  text: string;
  headingPath?: string;
};

type ChunkMetadata = {
  knowledgeBaseId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  text: string;
  retrievalVersion: number;
  contentHash: string;
  chunkId: string;
  headingPath?: string;
  previousChunkId?: string;
  nextChunkId?: string;
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

type RunnerPayload = Pick<Payload, 'findByID' | 'logger' | 'update'>;

export type KnowledgeIngestDependencies = {
  extractText: Extractor;
  embed: Embedder;
  vectorStore: VectorStore;
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

/**
 * Content-addressed chunk identity: the id follows the passage text rather than
 * its position, so inserting or removing earlier content does not renumber the
 * chunks after it and previously recorded evidence still resolves. A short
 * occurrence suffix disambiguates a passage repeated verbatim in one document.
 */
function chunkIdentities(
  documentId: string,
  chunks: readonly KnowledgeChunk[],
): { chunkId: string; contentHash: string }[] {
  const seen = new Map<string, number>();
  return chunks.map((chunk) => {
    const contentHash = createHash('sha256')
      .update(chunk.headingPath ? `${chunk.headingPath}\n${chunk.text}` : chunk.text)
      .digest('hex');
    const occurrence = seen.get(contentHash) ?? 0;
    seen.set(contentHash, occurrence + 1);
    const suffix = occurrence === 0 ? '' : `-${occurrence}`;
    return { chunkId: `${documentId}:${contentHash.slice(0, 16)}${suffix}`, contentHash };
  });
}

export function buildChunkMetadata(
  document: Pick<DocumentRecord, 'id' | 'filename' | 'title'>,
  knowledgeBaseId: number | string,
  chunks: readonly KnowledgeChunk[],
): ChunkMetadata[] {
  const identities = chunkIdentities(String(document.id), chunks);
  return chunks.map((chunk, chunkIndex) => ({
    knowledgeBaseId: String(knowledgeBaseId),
    documentId: String(document.id),
    title: document.title?.trim() || document.filename?.trim() || 'Document',
    chunkIndex,
    text: chunk.text,
    retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
    chunkId: identities[chunkIndex]!.chunkId,
    contentHash: identities[chunkIndex]!.contentHash,
    ...(chunk.headingPath ? { headingPath: chunk.headingPath } : {}),
    ...(chunkIndex > 0 ? { previousChunkId: identities[chunkIndex - 1]!.chunkId } : {}),
    ...(chunkIndex < chunks.length - 1 ? { nextChunkId: identities[chunkIndex + 1]!.chunkId } : {}),
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

/** Splits markdown into heading-bounded sections so retrieval keeps section context. */
function markdownSections(text: string): { heading?: string; level: number; body: string }[] {
  const sections: { heading?: string; level: number; body: string }[] = [];
  let current: { heading?: string; level: number; body: string } = { level: 0, body: '' };
  for (const line of text.split('\n')) {
    const heading = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      if (current.body.trim() || current.heading) sections.push(current);
      current = { heading: heading[2], level: heading[1]!.length, body: '' };
      continue;
    }
    current.body += `${line}\n`;
  }
  if (current.body.trim() || current.heading) sections.push(current);
  return sections;
}

function headingPathFor(stack: readonly string[]): string | undefined {
  return stack.length ? stack.join(' > ') : undefined;
}

/** A markdown table row: a line delimited by pipes. */
const TABLE_ROW = /^\s*\|.*\|\s*$/;

/**
 * Splits a markdown table into row groups that each repeat the header, so a
 * table larger than one chunk still yields readable, self-describing pieces
 * instead of anonymous rows.
 */
function splitTable(lines: readonly string[]): string[] {
  const header = lines.slice(0, 2).join('\n');
  const rows = lines.slice(2);
  if (rows.length === 0) return [lines.join('\n')];

  const pieces: string[] = [];
  let batch: string[] = [];
  const flush = () => {
    if (batch.length) pieces.push(`${header}\n${batch.join('\n')}`);
    batch = [];
  };
  for (const row of rows) {
    // Keep whole rows: a row is never divided across two chunks.
    if (batch.length && `${header}\n${batch.join('\n')}\n${row}`.length > CHUNK_MAX_SIZE) flush();
    batch.push(row);
  }
  flush();
  return pieces;
}

/**
 * Separates a section body into prose runs and whole tables, so table structure
 * survives chunking while prose still splits normally.
 */
function structuralSegments(text: string): { kind: 'prose' | 'table'; lines: string[] }[] {
  const segments: { kind: 'prose' | 'table'; lines: string[] }[] = [];
  for (const line of text.split('\n')) {
    const kind = TABLE_ROW.test(line) ? 'table' : 'prose';
    const last = segments.at(-1);
    if (last && last.kind === kind) last.lines.push(line);
    else segments.push({ kind, lines: [line] });
  }
  // A single pipe line is not a table; it needs a header and a delimiter row.
  return segments.map((segment) =>
    segment.kind === 'table' && segment.lines.length < 3
      ? { kind: 'prose' as const, lines: segment.lines }
      : segment,
  );
}

async function splitText(text: string, strategy: 'markdown' | 'recursive'): Promise<string[]> {
  const document =
    strategy === 'markdown' ? MDocument.fromMarkdown(text) : MDocument.fromText(text);
  const chunks = await document.chunk({
    strategy,
    maxSize: CHUNK_MAX_SIZE,
    overlap: CHUNK_OVERLAP,
  });
  return chunks.map((chunk) => chunk.text).filter((chunk) => chunk.trim().length > 0);
}

/** Chunks a section body, keeping tables whole and splitting prose normally. */
async function splitSectionBody(body: string): Promise<string[]> {
  const pieces: string[] = [];
  for (const segment of structuralSegments(body)) {
    if (segment.kind === 'table') {
      pieces.push(...splitTable(segment.lines));
      continue;
    }
    const prose = segment.lines.join('\n');
    if (prose.trim()) pieces.push(...(await splitText(prose, 'markdown')));
  }
  return pieces;
}

/**
 * Structure-aware chunking. Markdown is split on heading boundaries first so a
 * chunk never spans unrelated sections, and every chunk carries the heading path
 * it belongs to. Other formats fall back to paragraph-aware recursive chunking.
 */
export async function chunkKnowledgeText(
  text: string,
  mimeType: string,
): Promise<KnowledgeChunk[]> {
  const isMarkdown = mimeType.split(';')[0].trim() === 'text/markdown';
  if (!isMarkdown) {
    return (await splitText(text, 'recursive')).map((chunk) => ({ text: chunk }));
  }

  const stack: string[] = [];
  const levels: number[] = [];
  const chunks: KnowledgeChunk[] = [];
  for (const section of markdownSections(text)) {
    if (section.heading) {
      while (levels.length && levels[levels.length - 1]! >= section.level) {
        levels.pop();
        stack.pop();
      }
      levels.push(section.level);
      stack.push(section.heading);
    }
    const headingPath = headingPathFor(stack);
    const body = section.heading
      ? `${'#'.repeat(section.level)} ${section.heading}\n${section.body}`
      : section.body;
    if (!body.trim()) continue;
    for (const piece of await splitSectionBody(body)) {
      chunks.push({ text: piece, ...(headingPath ? { headingPath } : {}) });
    }
  }
  return chunks.length
    ? chunks
    : (await splitText(text, 'markdown')).map((chunk) => ({ text: chunk }));
}

async function embedLocally(values: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let offset = 0; offset < values.length; offset += EMBEDDING_BATCH_SIZE) {
    const result = await embedKnowledgeValues(values.slice(offset, offset + EMBEDDING_BATCH_SIZE));
    vectors.push(...result);
  }
  return vectors;
}

export function getKnowledgeVectorStore(): VectorStore {
  return knowledgeVectorStore();
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
    req: req as PayloadRequest,
    context: {
      ...(req?.context ?? {}),
      [CTX.skipIngestQueue]: true,
      [CTX.trustedKnowledgeLifecycle]: true,
    },
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
  };
  let knowledgeBaseId: number | string | undefined;

  try {
    const document = (await req.payload.findByID({
      collection: COLLECTIONS.knowledgeDocuments,
      id: documentId,
      depth: 0,
      overrideAccess: true,
      req: req as PayloadRequest,
    })) as unknown as DocumentRecord;
    knowledgeBaseId = relationId(document.knowledgeBase);
    if (knowledgeBaseId === undefined) throw new Error('Document has no knowledge base');
    if (!document.filename) throw new Error('Document has no uploaded file');
    if (!document.mimeType) throw new Error('Document has no MIME type');

    await patchDocument(
      req.payload,
      documentId,
      {
        indexingStatus: INDEXING_STATUS.indexing,
        errorMessage: '',
      },
      req as PayloadRequest,
    );

    const indexName = knowledgeIndexName(knowledgeBaseId);
    await deps.vectorStore.createIndex({
      indexName,
      dimension: KNOWLEDGE_EMBEDDING_DIMENSION,
      metric: 'cosine',
      metadataIndexes: ['knowledgeBaseId', 'documentId', 'chunkId'],
    });
    await deps.vectorStore.deleteVectors({
      indexName,
      filter: { documentId: String(documentId) },
    });
    const filePath = join(KNOWLEDGE_DIR, document.filename);
    const source = await readFile(filePath);
    const sourceHash = createHash('sha256').update(source).digest('hex');
    const text = await deps.extractText(filePath, document.mimeType);
    if (!text.trim()) throw new Error('Aucun texte exploitable n’a été extrait du document.');

    const chunks = await chunkKnowledgeText(text, document.mimeType);
    if (chunks.length === 0) throw new Error('Le document n’a produit aucun fragment exploitable.');
    const vectors = await deps.embed(
      chunks.map((chunk) =>
        chunk.headingPath ? `${chunk.headingPath}\n${chunk.text}` : chunk.text,
      ),
    );
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
      req: req as PayloadRequest,
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
      // Content-addressed ids keep a reindexed passage on the same vector row.
      ids: metadata.map((chunk) => chunk.chunkId),
      deleteFilter: { documentId: String(documentId) },
    });

    await patchDocument(
      req.payload,
      documentId,
      {
        indexingStatus: INDEXING_STATUS.indexed,
        retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
        errorMessage: '',
      },
      req as PayloadRequest,
    );
    req.payload.logger.info(
      { documentId, knowledgeBaseId, chunkCount: chunks.length },
      'knowledge document indexed',
    );
    return { output: { success: true, chunkCount: chunks.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchDocument(
      req.payload,
      documentId,
      {
        indexingStatus: INDEXING_STATUS.failed,
        errorMessage: message.slice(0, ERROR_LIMIT),
      },
      req as PayloadRequest,
    );
    throw error;
  }
}
