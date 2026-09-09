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
  slideCountRange: { min: 8, max: 12 },
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
  it('validates JSON ranges while accepting absent legacy values', async () => {
    const field = AgentRuns.fields.find(
      (field) => 'name' in field && field.name === 'slideCountRange',
    );
    if (!field || field.type !== 'json' || typeof field.validate !== 'function') {
      throw new Error('Expected a validated JSON slideCountRange field');
    }
    for (const value of [undefined, null, { min: 3, max: 40 }, { min: 8, max: 8 }]) {
      expect(await field.validate(value as never, {} as never)).toBe(true);
    }
    for (const value of [
      { min: 2, max: 10 },
      { min: 3, max: 41 },
      { min: 9, max: 8 },
      { min: 3.5, max: 8 },
      {},
    ]) {
      expect(await field.validate(value as never, {} as never)).not.toBe(true);
    }
  });

  it('rejects changing or clearing a range but accepts reordered identical bounds', async () => {
    await expect(applyUpdate({ slideCountRange: { min: 9, max: 12 } })).rejects.toMatchObject({
      status: 400,
    });
    await expect(applyUpdate({ slideCountRange: null })).rejects.toMatchObject({
      status: 400,
    });
    await expect(applyUpdate({ slideCountRange: { max: 12, min: 8 } })).resolves.toBeDefined();
  });

  it('cannot add a range to an old run but accepts its absent/null representation', async () => {
    const update = async (slideCountRange: unknown) =>
      beforeChange({
        collection: AgentRuns,
        context: {},
        operation: 'update',
        req: {} as never,
        originalDoc: { ...original, slideCountRange: undefined },
        data: { slideCountRange },
      } as never);
    await expect(update({ min: 8, max: 12 })).rejects.toMatchObject({
      status: 400,
    });
    await expect(update(null)).resolves.toBeDefined();
  });

  it('is a deck-scoped technical ledger, never a user-facing collection', () => {
    expect(AgentRuns.admin?.hidden).toBe(true);
  });

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
