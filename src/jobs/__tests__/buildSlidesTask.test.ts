import { describe, expect, it } from 'vitest';

import { buildSlidesTask } from '../buildSlides';

describe('buildSlidesTask', () => {
  it('accepts only the presentation identity and stale-build token', () => {
    expect(buildSlidesTask.inputSchema).toEqual([
      { name: 'presentationId', type: 'text', required: true },
      { name: 'buildToken', type: 'text' },
    ]);
  });

  it('serializes builds for the same presentation across worker replicas', () => {
    expect(buildSlidesTask.concurrency).toBeTypeOf('function');

    const concurrencyKey = (buildSlidesTask.concurrency as Function)({
      input: { presentationId: '42' },
      queue: 'default',
    });

    expect(concurrencyKey).toBe('buildSlides:42');
  });
});
