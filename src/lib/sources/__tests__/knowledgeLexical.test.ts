import { describe, expect, it, vi } from 'vitest';

import { createKnowledgeLexicalStore, type KnowledgeSqlStore } from '../knowledgeLexical';

function sqlStore(rows: Array<{ id: string; score: number; metadata: Record<string, unknown> }>) {
  return {
    queryKnowledgeRows: vi.fn().mockResolvedValue(rows),
  } satisfies KnowledgeSqlStore;
}

describe('createKnowledgeLexicalStore', () => {
  it('runs an exact-term query in PostgreSQL instead of sampling vector rows', async () => {
    const store = sqlStore([{ id: 'target', score: 1, metadata: { text: 'Référence ZX-9917' } }]);
    const lexical = createKnowledgeLexicalStore(store);

    const hits = await lexical.search({
      indexName: 'knowledge_42',
      knowledgeBaseId: '42',
      retrievalVersion: 4,
      query: 'référence ZX-9917',
      topK: 5,
    });

    expect(hits.map((hit) => hit.id)).toEqual(['target']);
    expect(store.queryKnowledgeRows).toHaveBeenCalledWith({
      indexName: 'knowledge_42',
      knowledgeBaseId: '42',
      retrievalVersion: 4,
      terms: ['référence', 'zx', '9917'],
      topK: 5,
    });
  });

  it('looks neighbors up directly by id under the same base and retrieval version', async () => {
    const store = sqlStore([
      { id: 'neighbor-b', score: 0, metadata: { text: 'B' } },
      { id: 'neighbor-a', score: 0, metadata: { text: 'A' } },
    ]);
    const lexical = createKnowledgeLexicalStore(store);

    const hits = await lexical.byIds({
      indexName: 'knowledge_42',
      knowledgeBaseId: '42',
      retrievalVersion: 4,
      ids: ['neighbor-a', 'neighbor-b', 'neighbor-a'],
    });

    expect(hits).toEqual([
      { id: 'neighbor-b', score: 0, metadata: { text: 'B' } },
      { id: 'neighbor-a', score: 0, metadata: { text: 'A' } },
    ]);
    expect(store.queryKnowledgeRows).toHaveBeenCalledWith({
      indexName: 'knowledge_42',
      knowledgeBaseId: '42',
      retrievalVersion: 4,
      ids: ['neighbor-a', 'neighbor-b'],
      topK: 2,
    });
  });

  it('rejects an index name that is not the server-owned base index', async () => {
    const lexical = createKnowledgeLexicalStore(sqlStore([]));

    await expect(
      lexical.search({
        indexName: 'knowledge_7; DROP TABLE users',
        knowledgeBaseId: '7',
        retrievalVersion: 4,
        query: 'budget',
        topK: 5,
      }),
    ).rejects.toThrow(/index/);
  });
});
