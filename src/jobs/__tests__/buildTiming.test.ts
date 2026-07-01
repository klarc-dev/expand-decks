import { describe, expect, it } from 'vitest';

import { buildLogPayload, createBuildTimer, type Now } from '../buildTiming';

/** Deterministic fake clock: advances by scripted deltas on each call. */
function fakeClock(values: number[]): Now {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

describe('createBuildTimer', () => {
  it('records durations for multiple timed stages and total elapsed', async () => {
    // start=0, stageA start=0, stageA end=10, stageB start=10, stageB end=40, elapsed=40
    const timer = createBuildTimer(fakeClock([0, 0, 10, 10, 40, 40]));

    await timer.stage('a', async () => 'ra');
    await timer.stage('b', async () => 'rb');

    expect(timer.durations()).toEqual({ a: 10, b: 30 });
    expect(timer.elapsed()).toBe(40);
  });

  it('records elapsed time before rethrowing when a stage throws', async () => {
    const timer = createBuildTimer(fakeClock([0, 0, 25, 25]));

    await expect(
      timer.stage('boom', async () => {
        throw new Error('stage failed');
      }),
    ).rejects.toThrow('stage failed');

    expect(timer.durations()).toEqual({ boom: 25 });
  });

  it('mark returns elapsed-since-start and records it', () => {
    const timer = createBuildTimer(fakeClock([0, 12, 12]));
    expect(timer.mark('checkpoint')).toBe(12);
    expect(timer.durations()).toEqual({ checkpoint: 12 });
  });

  it('recordSince records elapsed time since a prior elapsed value', () => {
    const timer = createBuildTimer(fakeClock([0, 15, 55]));
    const startedAt = timer.elapsed();
    expect(startedAt).toBe(15);
    expect(timer.recordSince('syncWork', startedAt)).toBe(40);
    expect(timer.durations()).toEqual({ syncWork: 40 });
  });
});

describe('buildLogPayload', () => {
  it('omits undefined metadata fields rather than serializing placeholders', () => {
    const payload = buildLogPayload(
      { presentationId: 'p1', buildToken: undefined, slideCount: 3, hasMermaid: false },
      { exportPdf: 1200 },
      1500,
    );

    expect(payload).toEqual({
      presentationId: 'p1',
      slideCount: 3,
      hasMermaid: false,
      totalMs: 1500,
      timings: { exportPdf: 1200 },
    });
    expect('buildToken' in payload).toBe(false);
  });
});
