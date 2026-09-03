import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KNOWLEDGE_DIR } from '../../lib/paths';
import {
  buildChunkMetadata,
  extractKnowledgeText,
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
  const dbUpdate = vi.fn().mockResolvedValue({});
  const createIndex = vi.fn().mockResolvedValue(undefined);
  const upsert = options?.vectorFailure
    ? vi.fn().mockRejectedValue(new Error('vector unavailable'))
    : vi.fn().mockResolvedValue(['one']);
  const payload = {
    findByID: vi.fn().mockResolvedValue(document),
    find: vi.fn().mockResolvedValue({ docs: [{ indexingStatus: 'indexed', chunkCount: 1 }] }),
    update,
    db: { updateOne: dbUpdate },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
  const dependencies = {
    extractText: vi.fn().mockResolvedValue(options?.extractEmpty ? '   ' : 'Alpha\n\nBeta'),
    embed: vi
      .fn()
      .mockImplementation(async (values: string[]) => values.map(() => Array(384).fill(0.1))),
    vectorStore: { createIndex, upsert },
    now: () => new Date('2026-09-03T10:00:00.000Z'),
  };
  return { payload, dependencies, updates, createIndex, upsert, dbUpdate };
}

beforeEach(() => mkdirSync(KNOWLEDGE_DIR, { recursive: true }));
afterEach(() => rmSync(KNOWLEDGE_DIR, { recursive: true, force: true }));

describe('knowledge ingestion runner', () => {
  it('indexes chunks with verbatim metadata and persists document/base summaries', async () => {
    writeFileSync(join(KNOWLEDGE_DIR, 'guide.txt'), 'source bytes');
    const state = makePayload();

    const result = await runKnowledgeIngestTask(
      { input: { documentId: 12 }, req: { payload: state.payload as never } },
      state.dependencies,
    );

    expect(result.output).toEqual({ success: true, chunkCount: 1 });
    expect(state.createIndex).toHaveBeenCalledWith({
      indexName: 'knowledge_7',
      dimension: 384,
      metric: 'cosine',
      metadataIndexes: ['knowledgeBaseId', 'documentId'],
    });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: 'knowledge_7',
        metadata: [
          {
            knowledgeBaseId: '7',
            documentId: '12',
            title: 'Guide produit',
            chunkIndex: 0,
            text: 'Alpha\n\nBeta',
          },
        ],
      }),
    );
    expect(state.updates.at(-1)).toMatchObject({
      indexingStatus: 'indexed',
      chunkCount: 1,
      errorMessage: '',
      sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(state.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { skipIngestQueue: true, trustedKnowledgeLifecycle: true },
      }),
    );
    expect(state.dbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'knowledge-bases',
        id: 7,
        data: expect.objectContaining({ documentCount: 1, chunkCount: 1 }),
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
    expect(state.updates.at(-1)).toMatchObject({ indexingStatus: 'failed', chunkCount: 0 });
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

  it('builds ordered verbatim chunk metadata', () => {
    expect(buildChunkMetadata({ id: '9', title: 'Notes' }, 3, ['one', 'two'])).toEqual([
      { knowledgeBaseId: '3', documentId: '9', title: 'Notes', chunkIndex: 0, text: 'one' },
      { knowledgeBaseId: '3', documentId: '9', title: 'Notes', chunkIndex: 1, text: 'two' },
    ]);
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
