import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KNOWLEDGE_DIR } from '../../lib/paths';
import {
  KNOWLEDGE_EMBEDDING_DIMENSION,
  KNOWLEDGE_EMBEDDING_PASSAGE_MODEL_ID,
  KNOWLEDGE_EMBEDDING_QUERY_MODEL_ID,
} from '../../lib/sources/knowledgeVector';
import {
  buildChunkMetadata,
  chunkKnowledgeText,
  extractKnowledgeText,
  KNOWLEDGE_RETRIEVAL_VERSION,
  needsReindex,
  knowledgeIndexName,
  runKnowledgeIngestTask,
} from '../knowledgeIngestRunner';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function simplePdf(text: string): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${text.length + 35} >>\nstream\nBT /F1 12 Tf 72 72 Td (${text}) Tj ET\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

function makePayload(options?: { extractEmpty?: boolean; vectorFailure?: boolean }) {
  const document = {
    id: 12,
    title: 'Guide produit',
    filename: 'guide.txt',
    mimeType: 'text/plain',
    knowledgeBase: 7,
  };
  const updates: Record<string, unknown>[] = [];
  const update = vi.fn(async ({ data }) => {
    updates.push(data);
    return { ...document, ...data };
  });
  const createIndex = vi.fn().mockResolvedValue(undefined);
  const deleteVectors = vi.fn().mockResolvedValue(undefined);
  const deleteIndex = vi.fn().mockResolvedValue(undefined);
  const upsert = options?.vectorFailure
    ? vi.fn().mockRejectedValue(new Error('vector unavailable'))
    : vi.fn().mockResolvedValue(['one']);
  const payload = {
    findByID: vi.fn().mockResolvedValue(document),
    update,
    logger: { info: vi.fn(), warn: vi.fn() },
  };
  const dependencies = {
    extractText: vi.fn().mockResolvedValue(options?.extractEmpty ? '   ' : 'Alpha\n\nBeta'),
    embed: vi
      .fn()
      .mockImplementation(async (values: string[]) =>
        values.map(() => Array(KNOWLEDGE_EMBEDDING_DIMENSION).fill(0.1)),
      ),
    vectorStore: { createIndex, upsert, deleteVectors, deleteIndex },
  };
  return { payload, dependencies, updates, createIndex, upsert };
}

beforeEach(() => mkdirSync(KNOWLEDGE_DIR, { recursive: true }));
afterEach(() => rmSync(KNOWLEDGE_DIR, { recursive: true, force: true }));

describe('knowledge ingestion runner', () => {
  it('uses the multilingual query/passage embedding pair', () => {
    expect(KNOWLEDGE_EMBEDDING_QUERY_MODEL_ID).toBe('multilingual-e5-large-query');
    expect(KNOWLEDGE_EMBEDDING_PASSAGE_MODEL_ID).toBe('multilingual-e5-large-passage');
    expect(KNOWLEDGE_EMBEDDING_DIMENSION).toBe(1024);
  });

  it('indexes chunks with verbatim metadata and persists document/base summaries', async () => {
    writeFileSync(join(KNOWLEDGE_DIR, 'guide.txt'), 'source bytes');
    const state = makePayload();

    const request = { payload: state.payload as never };
    const result = await runKnowledgeIngestTask(
      { input: { documentId: 12 }, req: request },
      state.dependencies,
    );

    expect(result.output).toEqual({ success: true, chunkCount: 1 });
    expect(state.createIndex).toHaveBeenCalledWith({
      indexName: 'knowledge_7',
      dimension: KNOWLEDGE_EMBEDDING_DIMENSION,
      metric: 'cosine',
      metadataIndexes: ['knowledgeBaseId', 'documentId', 'chunkId'],
    });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: 'knowledge_7',
        deleteFilter: { documentId: '12' },
        metadata: [
          expect.objectContaining({
            knowledgeBaseId: '7',
            documentId: '12',
            title: 'Guide produit',
            chunkIndex: 0,
            text: 'Alpha\n\nBeta',
            retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
            chunkId: expect.stringMatching(/^12:[0-9a-f]{16}$/),
            contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          }),
        ],
        ids: [expect.stringMatching(/^12:[0-9a-f]{16}$/)],
      }),
    );
    expect(state.updates.at(-1)).toMatchObject({
      indexingStatus: 'indexed',
      errorMessage: '',
    });
    expect(state.payload.findByID).toHaveBeenCalledWith(expect.objectContaining({ req: request }));
    expect(state.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        req: request,
        context: { skipIngestQueue: true, trustedKnowledgeLifecycle: true },
      }),
    );
  });

  it('marks empty extraction as failed with a readable reason', async () => {
    writeFileSync(join(KNOWLEDGE_DIR, 'guide.txt'), 'source bytes');
    const state = makePayload({ extractEmpty: true });
    await expect(
      runKnowledgeIngestTask(
        { input: { documentId: 12 }, req: { payload: state.payload as never } },
        state.dependencies,
      ),
    ).rejects.toThrow(/Aucun texte exploitable/);
    expect(state.updates.at(-1)).toMatchObject({ indexingStatus: 'failed' });
    expect(state.dependencies.vectorStore.deleteVectors).toHaveBeenCalledWith({
      indexName: 'knowledge_7',
      filter: { documentId: '12' },
    });
  });

  it('marks vector-store failures as failed', async () => {
    writeFileSync(join(KNOWLEDGE_DIR, 'guide.txt'), 'source bytes');
    const state = makePayload({ vectorFailure: true });
    await expect(
      runKnowledgeIngestTask(
        { input: { documentId: 12 }, req: { payload: state.payload as never } },
        state.dependencies,
      ),
    ).rejects.toThrow('vector unavailable');
    expect(state.updates.at(-1)).toMatchObject({
      indexingStatus: 'failed',
      errorMessage: 'vector unavailable',
    });
  });
});

describe('knowledge ingestion helpers', () => {
  it('derives PgVector-safe per-base index names', () => {
    expect(knowledgeIndexName(42)).toBe('knowledge_42');
    expect(() => knowledgeIndexName('bad-id')).toThrow(/numeric/);
  });

  it('uses the filename when no separate title exists', () => {
    const metadata = buildChunkMetadata({ id: '9', filename: 'notes.md' }, 3, [
      { text: 'one' },
      { text: 'two' },
    ]);
    expect(metadata).toEqual([
      expect.objectContaining({
        knowledgeBaseId: '3',
        documentId: '9',
        title: 'notes.md',
        chunkIndex: 0,
        text: 'one',
        retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
        nextChunkId: metadata[1]!.chunkId,
      }),
      expect.objectContaining({
        knowledgeBaseId: '3',
        documentId: '9',
        title: 'notes.md',
        chunkIndex: 1,
        text: 'two',
        retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
        previousChunkId: metadata[0]!.chunkId,
      }),
    ]);
    expect(metadata[0]).not.toHaveProperty('previousChunkId');
    expect(metadata[1]).not.toHaveProperty('nextChunkId');
  });

  it('reindexes documents whose stored retrieval version is stale', () => {
    expect(needsReindex(undefined)).toBe(true);
    expect(needsReindex(KNOWLEDGE_RETRIEVAL_VERSION - 1)).toBe(true);
    expect(needsReindex(KNOWLEDGE_RETRIEVAL_VERSION)).toBe(false);
  });

  it('derives chunk identity from content so reindexing keeps stable ids', () => {
    const document = { id: '9', filename: 'notes.md' };
    const before = buildChunkMetadata(document, 3, [
      { text: 'alpha' },
      { text: 'beta' },
      { text: 'gamma' },
    ]);
    // A paragraph inserted at the top must not renumber the identity of the
    // passages that follow it, or saved evidence would dangle after reindexing.
    const after = buildChunkMetadata(document, 3, [
      { text: 'inserted' },
      { text: 'alpha' },
      { text: 'beta' },
      { text: 'gamma' },
    ]);
    const idOf = (chunks: ReturnType<typeof buildChunkMetadata>, text: string) =>
      chunks.find((chunk) => chunk.text === text)?.chunkId;
    expect(idOf(after, 'gamma')).toBe(idOf(before, 'gamma'));
    expect(idOf(after, 'alpha')).toBe(idOf(before, 'alpha'));
    expect(new Set(before.map((chunk) => chunk.chunkId)).size).toBe(3);
  });

  it('records a content hash so a passage can be verified against its source', () => {
    const [chunk] = buildChunkMetadata({ id: '9', filename: 'notes.md' }, 3, [{ text: 'alpha' }]);
    expect(chunk!.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stamps the retrieval version so stale representations can be reindexed', async () => {
    const metadata = buildChunkMetadata({ id: '9', filename: 'notes.md' }, 3, [{ text: 'one' }]);
    expect(KNOWLEDGE_RETRIEVAL_VERSION).toEqual(expect.any(Number));
    expect(metadata[0]!.retrievalVersion).toBe(KNOWLEDGE_RETRIEVAL_VERSION);
  });

  it('records heading path, stable chunk ids and neighbours for markdown sections', async () => {
    const chunks = await chunkKnowledgeText(
      [
        '# Pilote',
        '',
        'Le pilote dure six semaines.',
        '',
        '## Budget',
        '',
        'Budget 90 000 EUR.',
      ].join('\n'),
      'text/markdown',
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.headingPath)).toEqual(
      expect.arrayContaining([expect.stringContaining('Pilote')]),
    );

    const metadata = buildChunkMetadata({ id: '9', filename: 'notes.md' }, 3, chunks);
    expect(metadata[0]!.chunkId).toMatch(/^9:[0-9a-f]{16}$/);
    expect(metadata[0]!.previousChunkId).toBeUndefined();
    expect(metadata[0]!.nextChunkId).toBe(metadata[1]!.chunkId);
    expect(metadata.at(-1)!.nextChunkId).toBeUndefined();
  });

  it('keeps a markdown table intact rather than splitting its rows', async () => {
    const table = [
      '| Poste | Montant |',
      '| --- | --- |',
      ...Array.from({ length: 60 }, (_, index) => `| Ligne ${index} | ${index * 1000} EUR |`),
    ].join('\n');
    const chunks = await chunkKnowledgeText(`# Budget\n\n${table}\n`, 'text/markdown');

    const rowChunks = chunks.filter((chunk) => chunk.text.includes('| Ligne '));
    expect(rowChunks.length).toBeGreaterThan(0);
    // Every chunk carrying table rows must also carry the header, otherwise the
    // rows lose the column labels that make them readable.
    for (const chunk of rowChunks) {
      expect(chunk.text).toContain('| Poste | Montant |');
    }
  });

  it.each([
    ['plain text', 'sample.txt', 'text/plain', 'Texte brut'],
    ['markdown', 'sample.md', 'text/markdown', '# Markdown'],
  ])('extracts %s as UTF-8', async (_label, filename, mimeType, content) => {
    const path = join(KNOWLEDGE_DIR, filename);
    writeFileSync(path, content);
    await expect(extractKnowledgeText(path, mimeType)).resolves.toBe(content);
  });

  it('uses unpdf for PDF files', async () => {
    const path = join(KNOWLEDGE_DIR, 'sample.pdf');
    writeFileSync(path, simplePdf('Hello PDF'));
    await expect(extractKnowledgeText(path, 'application/pdf')).resolves.toContain('Hello PDF');
  });

  it('uses mammoth for DOCX files', async () => {
    const fixture = join(
      process.cwd(),
      'node_modules',
      'mammoth',
      'test',
      'test-data',
      'single-paragraph.docx',
    );
    await expect(extractKnowledgeText(fixture, DOCX_MIME)).resolves.toContain(
      'Walking on imported air',
    );
  });
});
