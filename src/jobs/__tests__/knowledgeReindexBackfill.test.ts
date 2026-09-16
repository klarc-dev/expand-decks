import { describe, expect, it, vi } from 'vitest';

import { KNOWLEDGE_RETRIEVAL_VERSION } from '../knowledgeIngestRunner';
import {
  backfillStaleKnowledgeDocuments,
  startKnowledgeReindexBackfill,
} from '../knowledgeReindexBackfill';

function payloadWith(docs: { id: number | string }[]) {
  const remaining = [...docs];
  return {
    find: vi.fn().mockImplementation(async ({ limit }: { limit: number }) => ({
      docs: remaining.splice(0, limit),
    })),
    update: vi.fn().mockResolvedValue({}),
    jobs: { queue: vi.fn().mockResolvedValue({}) },
    logger: { info: vi.fn(), error: vi.fn() },
  };
}

describe('backfillStaleKnowledgeDocuments', () => {
  it('does nothing in processes that do not own the backfill', async () => {
    const payload = payloadWith([{ id: 1 }]);

    const queued = await backfillStaleKnowledgeDocuments(payload, { isOwner: false });

    expect(queued).toBe(0);
    expect(payload.find).not.toHaveBeenCalled();
    expect(payload.jobs.queue).not.toHaveBeenCalled();
  });

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

  it('drains more than one bounded batch without queueing a document twice', async () => {
    vi.useFakeTimers();
    const payload = payloadWith(Array.from({ length: 121 }, (_, index) => ({ id: index + 1 })));

    const stop = startKnowledgeReindexBackfill(payload, { limit: 50, intervalMs: 10 });
    await vi.advanceTimersByTimeAsync(30);
    stop();

    expect(payload.find).toHaveBeenCalledTimes(4);
    expect(payload.jobs.queue).toHaveBeenCalledTimes(121);
    expect(
      new Set(
        payload.jobs.queue.mock.calls.map(
          ([call]) => (call as { input: { documentId: number } }).input.documentId,
        ),
      ).size,
    ).toBe(121);
    vi.useRealTimers();
  });

  it('leaves a document stale and retryable when queueing fails', async () => {
    const payload = payloadWith([{ id: 1 }]);
    payload.jobs.queue.mockRejectedValueOnce(new Error('queue unavailable'));

    expect(await backfillStaleKnowledgeDocuments(payload)).toBe(0);
    expect(payload.update).not.toHaveBeenCalled();
  });

  it('keeps scheduled retries alive after an empty or failed batch', async () => {
    vi.useFakeTimers();
    const payload = payloadWith([]);
    const stop = startKnowledgeReindexBackfill(payload, { intervalMs: 10 });

    await vi.advanceTimersByTimeAsync(20);
    stop();

    expect(payload.find).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('bounds how many documents one query may claim', async () => {
    const payload = payloadWith([]);

    await backfillStaleKnowledgeDocuments(payload, { limit: 10 });

    expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });
});
