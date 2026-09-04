import { describe, expect, it, vi } from 'vitest';

import { KnowledgeDocuments } from '../KnowledgeDocuments';

const endpoints = Array.isArray(KnowledgeDocuments.endpoints) ? KnowledgeDocuments.endpoints : [];
const retryEndpoint = endpoints.find((endpoint) => endpoint.path === '/:id/retry');

function request(status: string = 'failed') {
  const update = vi.fn().mockResolvedValue({});
  const queue = vi.fn().mockResolvedValue({});
  return {
    update,
    queue,
    value: {
      user: { id: 4, role: 'author' },
      routeParams: { id: '12' },
      context: {},
      payload: {
        findByID: vi.fn().mockResolvedValue({ id: 12, indexingStatus: status }),
        update,
        jobs: { queue },
        logger: { warn: vi.fn() },
      },
    },
  };
}

describe('knowledge document retry endpoint', () => {
  it('queues a failed document with loop protection', async () => {
    if (!retryEndpoint) throw new Error('retry endpoint missing');
    const state = request();
    const response = await retryEndpoint.handler(state.value as never);

    expect(response.status).toBe(200);
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '12',
        data: { indexingStatus: 'pending', errorMessage: '' },
        context: { skipIngestQueue: true, trustedKnowledgeLifecycle: true },
      }),
    );
    expect(state.queue).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'knowledgeIngest', input: { documentId: '12' } }),
    );
  });

  it('refuses retry for a document that is not failed', async () => {
    if (!retryEndpoint) throw new Error('retry endpoint missing');
    const state = request('indexed');
    const response = await retryEndpoint.handler(state.value as never);
    expect(response.status).toBe(409);
    expect(state.queue).not.toHaveBeenCalled();
  });
});
