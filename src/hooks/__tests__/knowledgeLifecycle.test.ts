import { describe, expect, it, vi } from 'vitest';

import {
  afterKnowledgeBaseDelete,
  afterKnowledgeDocumentDelete,
  beforeKnowledgeBaseDelete,
} from '../knowledgeLifecycle';

function vectorStore() {
  return {
    deleteVectors: vi.fn().mockResolvedValue(undefined),
    deleteIndex: vi.fn().mockResolvedValue(undefined),
  };
}

describe('knowledge lifecycle deletion', () => {
  it('purges a deleted document by a server-imposed documentId filter and refreshes its base', async () => {
    const store = vectorStore();
    const find = vi.fn().mockResolvedValue({ docs: [] });
    const updateOne = vi.fn().mockResolvedValue({});

    await afterKnowledgeDocumentDelete(
      {
        doc: { id: 12, knowledgeBase: 7 },
        req: { context: {}, payload: { find, db: { updateOne }, logger: { warn: vi.fn() } } },
      } as never,
      store,
    );

    expect(store.deleteVectors).toHaveBeenCalledWith({
      indexName: 'knowledge_7',
      filter: { documentId: '12' },
    });
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'knowledge-bases',
        id: 7,
        data: expect.objectContaining({ documentCount: 0, chunkCount: 0 }),
      }),
    );
  });

  it('deletes all documents before a base and drops its per-base index afterwards', async () => {
    const store = vectorStore();
    const remove = vi.fn().mockResolvedValue({});

    await beforeKnowledgeBaseDelete({
      id: 7,
      req: { payload: { delete: remove }, context: {} },
    } as never);
    expect(remove).toHaveBeenCalledWith({
      collection: 'knowledge-documents',
      where: { knowledgeBase: { equals: 7 } },
      overrideAccess: true,
      context: { skipDocumentVectorPurge: true },
      req: expect.any(Object),
    });

    await afterKnowledgeBaseDelete(
      { doc: { id: 7 }, req: { payload: { logger: { warn: vi.fn() } } } } as never,
      store,
    );
    expect(store.deleteIndex).toHaveBeenCalledWith({ indexName: 'knowledge_7' });
  });
});
