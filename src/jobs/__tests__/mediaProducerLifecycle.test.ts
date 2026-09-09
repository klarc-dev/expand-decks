import { describe, expect, it, vi } from 'vitest';

import { MEDIA_PRODUCER_STATUS, pendingMediaProducerResult } from '../../lib/mediaProducer';
import { commitMediaProductionSuccess } from '../buildSlidesRunner';

const identity = {
  request_id: '23bdf992-2ea9-498d-9b40-fbe350f31628',
  publication_id: 'publication-1',
  revision_sha256: 'a'.repeat(64),
  presentation_id: 42,
};

describe('media producer terminal lifecycle', () => {
  it('commits success only while the exact request revision is still building', async () => {
    const update = vi.fn().mockResolvedValue({ docs: [{ id: 5 }], errors: [] });
    const result = pendingMediaProducerResult(identity, MEDIA_PRODUCER_STATUS.building);

    await expect(
      commitMediaProductionSuccess(
        { update } as never,
        {
          mediaProductionRequestId: '5',
          mediaRequestId: identity.request_id,
          publicationId: identity.publication_id,
          revisionSha256: identity.revision_sha256,
        } as never,
        { ...result, status: MEDIA_PRODUCER_STATUS.succeeded } as never,
      ),
    ).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { id: { equals: '5' } },
            { requestId: { equals: identity.request_id } },
            { publicationId: { equals: identity.publication_id } },
            { revisionSha256: { equals: identity.revision_sha256 } },
            { status: { equals: 'building' } },
          ],
        },
      }),
    );
  });

  it('refuses to overwrite a request concurrently transitioned to stale', async () => {
    const update = vi.fn().mockResolvedValue({ docs: [], errors: [] });
    await expect(
      commitMediaProductionSuccess(
        { update } as never,
        {
          mediaProductionRequestId: '5',
          mediaRequestId: identity.request_id,
          publicationId: identity.publication_id,
          revisionSha256: identity.revision_sha256,
        } as never,
        {} as never,
      ),
    ).resolves.toBe(false);
  });
});
