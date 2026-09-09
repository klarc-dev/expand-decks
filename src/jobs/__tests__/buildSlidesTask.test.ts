import { describe, expect, it } from 'vitest';

import { buildSlidesTask } from '../buildSlides';

describe('buildSlidesTask', () => {
  it('accepts the presentation identity, stale-build token, and producer revision binding', () => {
    expect(buildSlidesTask.inputSchema).toEqual([
      { name: 'presentationId', type: 'text', required: true },
      { name: 'buildToken', type: 'text' },
      { name: 'mediaProductionRequestId', type: 'text' },
      { name: 'mediaRequestId', type: 'text' },
      { name: 'publicationId', type: 'text' },
      { name: 'revisionSha256', type: 'text' },
    ]);
  });

  it('declares structured producer status and result output', () => {
    expect(buildSlidesTask.outputSchema).toEqual([
      { name: 'success', type: 'checkbox' },
      { name: 'status', type: 'text' },
      { name: 'result', type: 'json' },
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
