import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STALLED_JOB_AFTER_MS,
  requeueStalledJobs,
  startStalledJobSweep,
} from '../requeueStalledJobs';

function makePayload(docs: { id: number; taskSlug?: string; updatedAt?: string }[]) {
  const find = vi.fn().mockResolvedValue({ docs });
  const update = vi.fn().mockResolvedValue({});
  const logger = { info: vi.fn(), error: vi.fn() };
  return { payload: { find, update, logger }, find, update, logger };
}

describe('requeueStalledJobs', () => {
  it('releases only jobs left processing longer than the stall window', async () => {
    const now = new Date('2026-09-14T16:00:00.000Z');
    const { payload, find, update } = makePayload([
      { id: 12, taskSlug: 'buildSlides', updatedAt: '2026-08-20T09:08:00.000Z' },
      { id: 104, taskSlug: 'buildSlides', updatedAt: '2026-09-14T12:32:00.000Z' },
    ]);

    const released = await requeueStalledJobs(payload, { now, isOwner: true });

    expect(released).toBe(2);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'payload-jobs',
        where: {
          and: [
            { processing: { equals: true } },
            {
              updatedAt: {
                less_than: new Date(now.getTime() - STALLED_JOB_AFTER_MS).toISOString(),
              },
            },
          ],
        },
      }),
    );
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      collection: 'payload-jobs',
      id: 12,
      data: { processing: false },
    });
  });

  it('keeps going when one release fails and reports the rest', async () => {
    const { payload, update, logger } = makePayload([{ id: 1 }, { id: 2 }]);
    update.mockRejectedValueOnce(new Error('locked'));

    const released = await requeueStalledJobs(payload, { isOwner: true });

    expect(released).toBe(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('does nothing in worker replicas so only the owner process sweeps', async () => {
    const { payload, find } = makePayload([{ id: 1 }]);
    expect(await requeueStalledJobs(payload, { isOwner: false })).toBe(0);
    expect(find).not.toHaveBeenCalled();
  });
});

describe('startStalledJobSweep', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sweeps at boot and again on every interval until stopped', async () => {
    const { payload, find } = makePayload([]);

    const stop = startStalledJobSweep(payload, { intervalMs: 1000, isOwner: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(find).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(find).toHaveBeenCalledTimes(3);

    stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(find).toHaveBeenCalledTimes(3);
  });

  it('never arms a timer in worker replicas', async () => {
    const { payload, find } = makePayload([]);
    startStalledJobSweep(payload, { intervalMs: 1000, isOwner: false });
    await vi.advanceTimersByTimeAsync(3000);
    expect(find).not.toHaveBeenCalled();
  });
});
