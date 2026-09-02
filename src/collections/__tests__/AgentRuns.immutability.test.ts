import { describe, expect, it } from 'vitest';

import { AgentRuns } from '../AgentRuns';
import { AGENT_RUN_IMMUTABLE_FIELDS } from '../agentRunImmutability';

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

const beforeChange = AgentRuns.hooks!.beforeChange![0]!;

async function applyUpdate(data: Record<string, unknown>) {
  return beforeChange({
    collection: AgentRuns,
    context: {},
    data,
    operation: 'update',
    originalDoc: original,
    req: {} as never,
  } as never);
}

describe('AgentRun collection mutation boundary', () => {
  it('rejects a supplied immutable source-policy broadening', async () => {
    await expect(
      applyUpdate({ sourcePolicy: 'multiple', sourceIds: ['docs', 'other'] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects every supplied immutable field whose value changes', async () => {
    for (const field of AGENT_RUN_IMMUTABLE_FIELDS) {
      const changed = field === 'sourceIds' ? ['other'] : `changed-${field}`;
      await expect(applyUpdate({ [field]: changed })).rejects.toMatchObject({
        status: 400,
      });
    }
  });

  it('allows omitted and semantically equal immutable values', async () => {
    await expect(
      applyUpdate({
        presentation: { id: 1 },
        sourceIds: ['docs'],
        status: 'running',
      }),
    ).resolves.toMatchObject({ status: 'running' });
  });

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
