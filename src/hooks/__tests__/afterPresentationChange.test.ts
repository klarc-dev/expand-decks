import { describe, expect, it, vi } from 'vitest';

import { CTX } from '../../lib/context';
import { BUILD_SLIDES_TASK } from '../../jobs/buildSlides';
import { DEFAULT_OUTPUT_POLICY } from '../../lib/outputPolicy';
import { BUILD_STATUS } from '../../lib/status';
import { afterPresentationChange, buildInputsChanged } from '../afterPresentationChange';

const base = {
  slides: [{ blockType: 'cover', title: 'A' }],
  organisation: 1,
  footer: { enabled: true, left: '{org.name}', center: '', right: '{page} / {total}' },
  title: 'Deck',
  language: 'fr',
};

describe('afterPresentationChange', () => {
  it('queues a build on every update save, even when the presentation is not published', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const queue = vi.fn().mockResolvedValue({});
    const run = vi.fn().mockResolvedValue({});
    const doc = { id: 'presentation-1', status: 'draft', ...base };

    const result = await afterPresentationChange({
      doc,
      operation: 'update',
      req: { context: {}, payload: { db: { updateOne }, jobs: { queue, run } } },
    } as never);

    expect(result).toBe(doc);
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'presentations',
        id: 'presentation-1',
        req: expect.any(Object),
      }),
    );
    expect(updateOne.mock.calls[0]?.[0].data).toEqual({
      lastBuildToken: expect.any(String),
      lastBuildRequestedAt: expect.any(String),
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
      updatedAt: null,
    });
    expect(Date.parse(updateOne.mock.calls[0]?.[0].data.lastBuildRequestedAt)).not.toBeNaN();
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({
        task: BUILD_SLIDES_TASK,
        input: {
          presentationId: 'presentation-1',
          buildToken: updateOne.mock.calls[0]?.[0].data.lastBuildToken,
          outputPolicy: DEFAULT_OUTPUT_POLICY,
        },
      }),
    );
    // The hook kicks the queue on-demand (fire-and-forget) to avoid waiting for
    // the next autoRun tick. It runs in a void-ed microtask, so flush before asserting.
    await Promise.resolve();
    expect(run).toHaveBeenCalled();
  });

  it('reuses the active request transaction for the create-time status patch', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const queue = vi.fn().mockResolvedValue({});
    const run = vi.fn().mockResolvedValue({});
    const req = {
      context: {},
      payload: { db: { updateOne }, jobs: { queue, run } },
      transactionID: 'tx-1',
    };

    await afterPresentationChange({
      doc: { id: 'presentation-new', status: 'draft', ...base },
      operation: 'create',
      req,
    } as never);

    expect(updateOne).toHaveBeenCalledWith(expect.objectContaining({ req }));
  });

  it('does not queue when the internal skipBuildQueue flag is set', async () => {
    const updateOne = vi.fn();
    const queue = vi.fn();
    const doc = { id: 'presentation-1', status: 'published', ...base };

    const result = await afterPresentationChange({
      doc,
      operation: 'update',
      req: {
        context: { [CTX.skipBuildQueue]: true },
        payload: { db: { updateOne }, jobs: { queue } },
      },
    } as never);

    expect(result).toBe(doc);
    expect(updateOne).not.toHaveBeenCalled();
    expect(queue).not.toHaveBeenCalled();
  });
});

describe('buildInputsChanged — rebuild fingerprint', () => {
  it('is false when nothing build-affecting changed', () => {
    expect(buildInputsChanged({ ...base }, { ...base })).toBe(false);
  });

  it('ignores non-build fields (e.g. build artifacts / status)', () => {
    expect(
      buildInputsChanged(
        { ...base, lastBuildStatus: 'success', spaUrl: '/x' },
        { ...base, lastBuildStatus: 'idle', spaUrl: null },
      ),
    ).toBe(false);
  });

  it('detects slides changes', () => {
    expect(buildInputsChanged({ ...base, slides: [{ blockType: 'cta', title: 'Z' }] }, base)).toBe(
      true,
    );
  });

  it('detects organisation change (theme swap)', () => {
    expect(buildInputsChanged({ ...base, organisation: 2 }, base)).toBe(true);
  });

  it('treats a populated org relationship the same as its id', () => {
    expect(buildInputsChanged({ ...base, organisation: { id: 1, name: 'Klarc' } }, base)).toBe(
      false,
    );
  });

  it('detects footer, title and language changes', () => {
    expect(buildInputsChanged({ ...base, footer: { ...base.footer, left: '{title}' } }, base)).toBe(
      true,
    );
    expect(buildInputsChanged({ ...base, title: 'New' }, base)).toBe(true);
    expect(buildInputsChanged({ ...base, language: 'en' }, base)).toBe(true);
  });
});
