import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '../concurrency';

describe('mapWithConcurrency', () => {
  it('preserves order with limit=1', async () => {
    expect(await mapWithConcurrency([1, 2, 3], 1, async (x) => x * 2)).toEqual([2, 4, 6]);
  });

  it('preserves order with limit > length', async () => {
    expect(await mapWithConcurrency([1, 2, 3], 10, async (x) => x * 2)).toEqual([2, 4, 6]);
  });

  it('respects concurrency cap (never more than `limit` in flight)', async () => {
    let inFlight = 0;
    let max = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (x) => {
      inFlight++;
      max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return x;
    });
    expect(max).toBeLessThanOrEqual(2);
  });
});
