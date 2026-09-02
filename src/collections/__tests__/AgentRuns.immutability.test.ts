import { describe, expect, it } from 'vitest';

import { AGENT_RUN_IMMUTABLE_FIELDS, preserveAgentRunInputs } from '../agentRunImmutability';

const original = {
  presentation: 1,
  createdBy: 2,
  organisation: 3,
  mastraRunId: 'run-1',
  requestId: 'request-1',
  traceId: 'trace-1',
  mode: 'replace',
  brief: 'Original sufficiently detailed brief',
  language: 'fr',
  visual: true,
  approvalRequired: false,
  sourcePolicy: 'exclusive',
  sourceIds: ['docs'],
  revisionContext: 'original deck',
  inputFingerprint: 'fingerprint-1',
  status: 'queued',
};

async function applyUpdate(data: Record<string, unknown>) {
  return preserveAgentRunInputs({
    data,
    operation: 'update',
    originalDoc: original,
  } as never) as Promise<Record<string, unknown>> | Record<string, unknown>;
}

describe('AgentRun public mutation boundary', () => {
  it.each(['owner REST PATCH', 'admin REST PATCH', 'authenticated local update'])(
    'preserves immutable run inputs for %s',
    async () => {
      const attempted: Record<string, unknown> = Object.fromEntries(
        AGENT_RUN_IMMUTABLE_FIELDS.map((field) => [field, `changed-${field}`]),
      );
      attempted.sourceIds = ['other'];
      attempted.sourcePolicy = 'multiple';

      const result = await applyUpdate(attempted);

      for (const field of AGENT_RUN_IMMUTABLE_FIELDS) {
        expect(result[field]).toEqual(original[field as keyof typeof original]);
      }
    },
  );

  it('allows lifecycle fields to change after creation', async () => {
    const result = await applyUpdate({
      status: 'running',
      command: 'restart',
      phase: 'structure',
      heartbeatAt: '2026-09-02T12:00:00.000Z',
      sourceFailures: [{ sourceId: 'docs', stage: 'discover', code: 'unavailable' }],
    });

    expect(result).toMatchObject({
      status: 'running',
      command: 'restart',
      phase: 'structure',
      heartbeatAt: '2026-09-02T12:00:00.000Z',
      sourceFailures: [{ sourceId: 'docs', stage: 'discover', code: 'unavailable' }],
    });
  });
});
