import { describe, expect, it, vi } from 'vitest';

import { openSourceToolsets } from '../knowledgeConnector';
import { KNOWLEDGE_MIN_SCORE } from '../knowledgeRetrieval';
import type { ResolvedSource } from '../types';

const source = (overrides: Partial<ResolvedSource> = {}): ResolvedSource => ({
  id: 'knowledge_42',
  label: 'Contrats',
  allowedTools: ['search'],
  failureMode: 'strict',
  toolCallConcurrency: 2,
  maxResultBytes: 100_000,
  timeoutMs: 30_000,
  transport: 'knowledge',
  knowledgeBaseId: 42,
  indexName: 'knowledge_42',
  ...overrides,
});

describe('openSourceToolsets', () => {
  it('returns empty toolsets for no sources', async () => {
    const opened = await openSourceToolsets([]);
    expect(opened.toolsets).toEqual({});
    expect(opened.recorder.snapshot()).toEqual([]);
  });

  it('enforces the server index/filter and captures verbatim provenance', async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: 'chunk-1',
        score: 0.82,
        metadata: {
          knowledgeBaseId: '42',
          documentId: '9',
          title: 'Contrat cadre',
          chunkIndex: 3,
          text: '  Clause résolutoire verbatim.  ',
        },
      },
    ]);
    const opened = await openSourceToolsets([source()], {
      vectorStore: { query },
      embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
    });

    const result = await opened.toolsets.knowledge_42!.search!.execute?.(
      { query: 'clause résolutoire', topK: 10, indexName: 'evil' },
      { toolCallId: 'kb-call' } as never,
    );

    expect(query).toHaveBeenCalledWith({
      indexName: 'knowledge_42',
      queryVector: Array(384).fill(0.1),
      topK: 30,
      minScore: KNOWLEDGE_MIN_SCORE,
      filter: { knowledgeBaseId: '42' },
    });
    expect(result).toMatchObject({
      data: [{ text: '  Clause résolutoire verbatim.  ' }],
      evidenceIds: [expect.stringMatching(/^ev_[a-f0-9]{24}$/)],
    });
    expect(result).not.toHaveProperty('sourceId');
    expect(opened.recorder.snapshot()).toEqual([
      expect.objectContaining({
        sourceId: 'knowledge_42',
        excerpt: '  Clause résolutoire verbatim.  ',
        documentId: '9',
        documentTitle: 'Contrat cadre',
        chunkIndex: 3,
      }),
    ]);
  });

  it('applies one aggregate byte budget across excerpts', async () => {
    const maxResultBytes = 450;
    const query = vi.fn().mockResolvedValue(
      ['alpha', 'beta', 'gamma'].map((label, index) => ({
        id: `chunk-${index}`,
        score: 0.9 - index * 0.1,
        metadata: {
          knowledgeBaseId: '42',
          documentId: String(index + 1),
          title: `Document ${label}`,
          chunkIndex: index,
          text: `${label} ${'é'.repeat(100)}`,
        },
      })),
    );
    const opened = await openSourceToolsets([source({ maxResultBytes })], {
      vectorStore: { query },
      embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
    });

    const result = (await opened.toolsets.knowledge_42!.search!.execute?.(
      { query: 'documents', topK: 3 },
      { toolCallId: 'budget-call' } as never,
    )) as { data: Array<{ text: string }> };

    expect(result.data).toHaveLength(2);
    expect(Buffer.byteLength(JSON.stringify(result.data), 'utf8')).toBeLessThanOrEqual(
      maxResultBytes,
    );
    expect(result.data[1]!.text.length).toBeLessThan(`beta ${'é'.repeat(100)}`.length);
  });

  it('wraps vector failures as unavailable source failures', async () => {
    const opened = await openSourceToolsets([source()], {
      vectorStore: { query: vi.fn().mockRejectedValue(new Error('pgvector offline')) },
      embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
    });

    await expect(
      opened.toolsets.knowledge_42!.search!.execute?.({ query: 'x' }, {} as never),
    ).rejects.toMatchObject({
      failures: [
        expect.objectContaining({ sourceId: 'knowledge_42', stage: 'tool', code: 'unavailable' }),
      ],
    });
  });
});
