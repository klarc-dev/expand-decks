import { describe, expect, it, vi } from 'vitest';

import { queryKnowledgeRows } from '../knowledgeVector';

describe('queryKnowledgeRows', () => {
  it('uses a bounded parameterized lexical query over the complete versioned table', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'target', score: '1', metadata: { text: 'ZX-9917' } }],
      }),
    };

    const rows = await queryKnowledgeRows(pool, {
      indexName: 'knowledge_42',
      knowledgeBaseId: '42',
      retrievalVersion: 4,
      terms: ['zx', '9917'],
      topK: 7,
    });

    expect(rows).toEqual([{ id: 'target', score: 1, metadata: { text: 'ZX-9917' } }]);
    const [sql, values] = pool.query.mock.calls[0]!;
    expect(sql).toContain('FROM "mastra_vectors"."knowledge_42"');
    expect(sql).toContain("metadata->>'knowledgeBaseId' = $1");
    expect(sql).toContain("metadata->>'retrievalVersion' = $2");
    expect(sql).toContain('LIMIT $4');
    expect(values).toEqual(['42', '4', ['zx', '9917'], 7]);
    expect(sql).not.toContain('ZX-9917');
  });

  it('performs direct parameterized neighbor id lookup', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };

    await queryKnowledgeRows(pool, {
      indexName: 'knowledge_9',
      knowledgeBaseId: '9',
      retrievalVersion: 4,
      ids: ['a', 'b'],
      topK: 2,
    });

    const [sql, values] = pool.query.mock.calls[0]!;
    expect(sql).toContain('vector_id = ANY($3::text[])');
    expect(values).toEqual(['9', '4', ['a', 'b'], 2]);
  });
});
