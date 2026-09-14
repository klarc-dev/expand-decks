import { describe, expect, it, vi } from 'vitest';

import {
  beforeKnowledgeBaseDelete,
  beforeKnowledgeDocumentDelete,
  syncKnowledgeBaseReadiness,
  syncKnowledgeReadinessAfterChange,
} from '../knowledgeLifecycle';

function vectorStore() {
  return {
    deleteVectors: vi.fn().mockResolvedValue(undefined),
    deleteIndex: vi.fn().mockResolvedValue(undefined),
  };
}

describe('knowledge lifecycle deletion', () => {
  it('purges a standalone document before deletion', async () => {
    const store = vectorStore();
    const findByID = vi.fn().mockResolvedValue({ id: 12, knowledgeBase: 7 });
    const req = {
      context: {},
      payload: { findByID },
    };

    await beforeKnowledgeDocumentDelete({ id: 12, req } as never, store);
    expect(store.deleteVectors).toHaveBeenCalledWith({
      indexName: 'knowledge_7',
      filter: { documentId: '12' },
    });
  });

  it('aborts a document delete while its Payload record still exists when vector purge fails', async () => {
    const store = vectorStore();
    store.deleteVectors.mockRejectedValue(new Error('vector unavailable'));
    const findByID = vi.fn().mockResolvedValue({ id: 12, knowledgeBase: 7 });

    await expect(
      beforeKnowledgeDocumentDelete(
        { id: 12, req: { context: {}, payload: { findByID } } } as never,
        store,
      ),
    ).rejects.toThrow('vector unavailable');
    expect(findByID).toHaveBeenCalled();
  });

  it('drops a base index before deleting children and skips redundant child purges', async () => {
    const order: string[] = [];
    const store = vectorStore();
    store.deleteIndex.mockImplementation(async () => {
      order.push('index');
    });
    const remove = vi.fn().mockImplementation(async () => {
      order.push('documents');
    });

    await beforeKnowledgeBaseDelete(
      { id: 7, req: { payload: { delete: remove }, context: {} } } as never,
      store,
    );

    expect(order).toEqual(['index', 'documents']);
    expect(store.deleteIndex).toHaveBeenCalledWith({ indexName: 'knowledge_7' });
    expect(remove).toHaveBeenCalledWith({
      collection: 'knowledge-documents',
      where: { knowledgeBase: { equals: 7 } },
      overrideAccess: true,
      context: { skipDocumentVectorPurge: true },
      req: expect.any(Object),
    });
  });

  it('keeps all Payload children when base index deletion fails', async () => {
    const store = vectorStore();
    store.deleteIndex.mockRejectedValue(new Error('vector unavailable'));
    const remove = vi.fn();

    await expect(
      beforeKnowledgeBaseDelete(
        { id: 7, req: { payload: { delete: remove }, context: {} } } as never,
        store,
      ),
    ).rejects.toThrow('vector unavailable');
    expect(remove).not.toHaveBeenCalled();
  });

  it('skips vector work for documents deleted by a base cascade', async () => {
    const store = vectorStore();
    const findByID = vi.fn();
    const req = {
      context: { skipDocumentVectorPurge: true },
      payload: { findByID },
    };

    await beforeKnowledgeDocumentDelete({ id: 12, req } as never, store);

    expect(findByID).not.toHaveBeenCalled();
    expect(store.deleteVectors).not.toHaveBeenCalled();
  });
});

describe('knowledge base readiness', () => {
  function payloadWith(statuses: string[]) {
    const update = vi.fn().mockResolvedValue({});
    const find = vi
      .fn()
      .mockResolvedValue({ docs: statuses.map((indexingStatus) => ({ indexingStatus })) });
    return { update, find, payload: { find, update } };
  }

  it.each([
    [[], 'empty'],
    [['pending', 'indexed'], 'ready'],
    [['failed', 'failed'], 'failed'],
    [['pending', 'indexing'], 'unavailable'],
  ])('derives %j as %s', async (statuses, readiness) => {
    const state = payloadWith(statuses as string[]);
    await syncKnowledgeBaseReadiness(state.payload as never, 7);
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ data: { readiness } }));
  });

  it('refreshes both bases when a document moves, even for lifecycle writes', async () => {
    const state = payloadWith(['indexed']);
    await syncKnowledgeReadinessAfterChange({
      doc: { id: 12, knowledgeBase: 9 },
      previousDoc: { id: 12, knowledgeBase: 7 },
      req: { context: { skipIngestQueue: true }, payload: state.payload },
    } as never);

    expect(state.update.mock.calls.map(([call]) => call.id)).toEqual([9, 7]);
  });
});
