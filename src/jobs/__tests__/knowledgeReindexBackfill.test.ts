import { describe, expect, it, vi } from 'vitest';

import { KNOWLEDGE_RETRIEVAL_VERSION } from '../knowledgeIngestRunner';
import { backfillStaleKnowledgeDocuments } from '../knowledgeReindexBackfill';

function payloadWith(docs: { id: number | string }[]) {
  return {
    find: vi.fn().mockResolvedValue({ docs }),
    update: vi.fn().mockResolvedValue({}),
    jobs: { queue: vi.fn().mockResolvedValue({}) },
    logger: { info: vi.fn(), error: vi.fn() },
  };
}

describe('backfillStaleKnowledgeDocuments', () => {
  it('requeues every document indexed under an older retrieval version', async () => {
    const payload = payloadWith([{ id: 1 }, { id: 2 }]);

    const queued = await backfillStaleKnowledgeDocuments(payload);

    expect(queued).toBe(2);
    expect(payload.jobs.queue).toHaveBeenCalledTimes(2);
    expect(payload.jobs.queue).toHaveBeenCalledWith(
      expect.objectContaining({ input: { documentId: 1 } }),
    );
  });

  it('selects only indexed documents below the current retrieval version', async () => {
    const payload = payloadWith([]);

    await backfillStaleKnowledgeDocuments(payload);

    const where = (payload.find.mock.calls[0]![0] as { where: Record<string, unknown> }).where;
    expect(JSON.stringify(where)).toContain(`"less_than":${KNOWLEDGE_RETRIEVAL_VERSION}`);
  });

  it('keeps draining the backlog when one document fails', async () => {
    const payload = payloadWith([{ id: 1 }, { id: 2 }]);
    payload.update.mockRejectedValueOnce(new Error('locked'));

    const queued = await backfillStaleKnowledgeDocuments(payload);

    expect(queued).toBe(1);
    expect(payload.logger.error).toHaveBeenCalled();
  });

  it('bounds how many documents one run may requeue', async () => {
    const payload = payloadWith([]);

    await backfillStaleKnowledgeDocuments(payload, 10);

    expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });
});
