import { describe, expect, it } from 'vitest';

import { buildSlidesTask } from '../buildSlides';

describe('buildSlidesTask', () => {
  it('accepts the presentation identity and stale-build token', () => {
    expect(buildSlidesTask.inputSchema).toEqual([
      { name: 'presentationId', type: 'text', required: true },
      { name: 'buildToken', type: 'text' },
    ]);
  });

  it('declares the build result output', () => {
    expect(buildSlidesTask.outputSchema).toEqual([{ name: 'success', type: 'checkbox' }]);
  });

  it('supersedes pending builds for the same presentation so change then undo builds final state', () => {
    expect(buildSlidesTask.concurrency).toMatchObject({ supersedes: true });
    if (typeof buildSlidesTask.concurrency !== 'object') throw new Error('missing concurrency');
    expect(buildSlidesTask.concurrency.key({ input: { presentationId: 'deck-42' } } as never)).toBe(
      'buildSlides:deck-42:generic',
    );
    expect(buildSlidesTask.concurrency.key({ input: { presentationId: 'deck-7' } } as never)).toBe(
      'buildSlides:deck-7:generic',
    );
    expect(
      buildSlidesTask.concurrency.key({
        input: { presentationId: 'deck-42', mediaProductionRequestId: 'request-9' },
      } as never),
    ).toBe('buildSlides:deck-42:producer:request-9');
    expect(
      buildSlidesTask.concurrency.key({
        input: { presentationId: 'deck-42', publicationId: 'publication-3' },
      } as never),
    ).toBe('buildSlides:deck-42:producer:publication-3');
  });
});
