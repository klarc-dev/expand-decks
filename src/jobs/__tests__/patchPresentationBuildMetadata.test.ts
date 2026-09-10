import { describe, expect, it, vi } from 'vitest';

import { COLLECTIONS } from '../../lib/collections';
import {
  patchPresentationBuildArtifacts,
  patchPresentationBuildMetadata,
} from '../patchPresentationBuildMetadata';

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
      returning: false,
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

  it('writes artifact arrays through the collection operation and restores the author timestamp', async () => {
    const update = vi.fn().mockResolvedValue({});
    const updateOne = vi.fn().mockResolvedValue(null);
    const artifacts = [{ key: 'pdf', buildId: 'build-1' }];

    await patchPresentationBuildArtifacts(
      { db: { updateOne }, update } as never,
      21,
      { artifacts, lastBuildStatus: 'success' },
      '2026-09-10T05:00:00.000Z',
    );

    expect(update).toHaveBeenCalledWith({
      collection: COLLECTIONS.presentations,
      id: 21,
      data: { artifacts, lastBuildStatus: 'success' },
      depth: 0,
      overrideAccess: true,
      overrideLock: true,
      context: { skipBuildQueue: true },
    });
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 21,
        data: { updatedAt: '2026-09-10T05:00:00.000Z' },
        returning: false,
      }),
    );
  });
});
