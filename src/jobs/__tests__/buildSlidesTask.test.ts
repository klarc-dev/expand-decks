import { describe, expect, it } from 'vitest';

import { buildSlidesTask } from '../buildSlides';

describe('buildSlidesTask', () => {
  it('serializes builds for the same presentation across worker replicas', () => {
    expect(buildSlidesTask.concurrency).toBeTypeOf('function');

    const concurrencyKey = (buildSlidesTask.concurrency as Function)({
      input: { presentationId: '42' },
      queue: 'default',
    });

    expect(concurrencyKey).toBe('buildSlides:42');
  });
});
