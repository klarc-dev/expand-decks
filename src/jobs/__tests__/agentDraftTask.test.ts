import { describe, expect, it } from 'vitest';

import { AGENT_DRAFT_TASK, agentDraftTask } from '../agentDraft';

describe('agentDraftTask', () => {
  it('serializes commands per presentation and retries only worker interruptions', () => {
    expect(AGENT_DRAFT_TASK).toBe('agentDraft');
    expect(agentDraftTask.concurrency.key({ input: { presentationId: '42' } })).toBe(
      'agentDraft:42',
    );
    expect(agentDraftTask.concurrency.supersedes).toBe(true);
    expect(agentDraftTask.inputSchema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'agentRunId', required: true }),
        expect.objectContaining({ name: 'presentationId', required: true }),
      ]),
    );
    expect(agentDraftTask.retries).toMatchObject({
      attempts: 2,
      backoff: { type: 'exponential', delay: 5_000 },
    });
    expect(agentDraftTask.handler).toBeTypeOf('function');
  });
});
