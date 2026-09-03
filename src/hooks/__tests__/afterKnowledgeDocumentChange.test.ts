import { describe, expect, it, vi } from 'vitest';

import { afterKnowledgeDocumentChange } from '../afterKnowledgeDocumentChange';

function args(overrides: Record<string, unknown> = {}) {
  const queue = vi.fn().mockResolvedValue({});
  const run = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  return {
    queue,
    run,
    update,
    value: {
      doc: { id: 12, filename: 'new.txt', mimeType: 'text/plain' },
      previousDoc: { id: 12, filename: 'old.txt', mimeType: 'text/plain' },
      operation: 'update',
      req: {
        context: {},
        payload: { jobs: { queue, run }, update, logger: { warn: vi.fn() } },
      },
      ...overrides,
    },
  };
}

describe('afterKnowledgeDocumentChange', () => {
  it('marks a replacement pending and queues ingestion', async () => {
    const state = args();
    await afterKnowledgeDocumentChange(state.value as never);
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ context: { skipIngestQueue: true } }),
    );
    expect(state.queue).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'knowledgeIngest', input: { documentId: 12 } }),
    );
  });

  it('does not queue title-only or internal status updates', async () => {
    const titleOnly = args({
      doc: { id: 12, filename: 'same.txt', mimeType: 'text/plain', title: 'new' },
      previousDoc: { id: 12, filename: 'same.txt', mimeType: 'text/plain', title: 'old' },
    });
    await afterKnowledgeDocumentChange(titleOnly.value as never);
    expect(titleOnly.queue).not.toHaveBeenCalled();

    const internal = args();
    (internal.value.req as { context: Record<string, boolean> }).context.skipIngestQueue = true;
    await afterKnowledgeDocumentChange(internal.value as never);
    expect(internal.queue).not.toHaveBeenCalled();
  });
});
