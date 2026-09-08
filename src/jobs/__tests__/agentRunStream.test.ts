import { describe, expect, it, vi } from 'vitest';

vi.mock('@/payload-types', () => ({}));
vi.mock('../../agents/mastra', () => ({ mastra: {} }));
vi.mock('../../agents/fonts', () => ({ chooseFontPairForBrief: vi.fn() }));
vi.mock('../../agents/tools/persist', () => ({ persistSlides: vi.fn() }));
vi.mock('../../lib/deckContext', () => ({ deckContext: vi.fn() }));
vi.mock('../../lib/currentDeckContext', () => ({ currentDeckContext: vi.fn() }));
vi.mock('../../agents/requestContext', () => ({ createDeckRequestContext: vi.fn() }));
vi.mock('../../lib/sources/serverContext', () => ({ configureSourceResolutionPayload: vi.fn() }));

import { consumeWorkflowStream } from '../agentRunCommands';

describe('consumeWorkflowStream', () => {
  it('consumes fullStream events and mirrors workflow steps', async () => {
    const mirror = vi.fn().mockResolvedValue(undefined);
    const stream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'workflow-step-start', payload: { id: 'gather' } };
        yield {
          type: 'workflow-step-progress',
          payload: { id: 'structure', completedCount: 1, totalCount: 2 },
        };
      },
    };

    await consumeWorkflowStream(stream, mirror);

    expect(mirror).toHaveBeenNthCalledWith(1, 'gather');
    expect(mirror).toHaveBeenNthCalledWith(2, 'structure', { completed: 1, total: 2 });
  });

  it('does not consume a deprecated iterator when fullStream is available', async () => {
    const mirror = vi.fn().mockResolvedValue(undefined);
    const stream = {
      fullStream: {
        async *[Symbol.asyncIterator]() {
          yield { type: 'workflow-step-start', payload: { id: 'gather' } };
        },
      },
      [Symbol.asyncIterator]() {
        throw new Error('deprecated iterator was consumed');
      },
    };

    await consumeWorkflowStream(stream.fullStream, mirror);

    expect(mirror).toHaveBeenCalledWith('gather');
  });
});
