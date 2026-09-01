import { describe, expect, it, vi } from 'vitest';

import { abortableDelay, combineAbortSignals } from '../abort';

describe('abort utilities', () => {
  it('combines caller cancellation with the local timeout', () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const combined = combineAbortSignals(caller.signal, 10_000);
    caller.abort(new DOMException('Canceled', 'AbortError'));
    expect(combined.aborted).toBe(true);
    vi.useRealTimers();
  });

  it('interrupts retry backoff immediately', async () => {
    const caller = new AbortController();
    const waiting = abortableDelay(60_000, caller.signal);
    caller.abort(new DOMException('Canceled', 'AbortError'));
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  });
});
