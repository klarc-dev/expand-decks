import { describe, expect, it, vi } from 'vitest';

import { COLLECTIONS } from '../../lib/collections';
import { patchPresentationBuildMetadata } from '../patchPresentationBuildMetadata';

describe('patchPresentationBuildMetadata', () => {
  it('uses the database adapter so operational state does not advance updatedAt', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const data = { lastBuildStatus: 'success', spaUrl: '/spa/deck/index.html' };

    await patchPresentationBuildMetadata({ db: { updateOne } } as never, 19, data);

    expect(updateOne).toHaveBeenCalledWith({
      collection: COLLECTIONS.presentations,
      id: 19,
      data: { ...data, updatedAt: null },
      req: undefined,
    });
  });

  it('threads an active request transaction when supplied', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const req = { transactionID: 'tx-1' };

    await patchPresentationBuildMetadata(
      { db: { updateOne } } as never,
      20,
      { lastBuildStatus: 'building' },
      req as never,
    );

    expect(updateOne).toHaveBeenCalledWith(expect.objectContaining({ req }));
  });
});
