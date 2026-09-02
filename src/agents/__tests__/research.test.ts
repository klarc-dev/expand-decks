import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openSourceToolsets: vi.fn(),
  resolveSourcePolicy: vi.fn(),
  researchWithSources: vi.fn(),
}));

vi.mock('../../lib/sources/mcpConnector', () => ({
  openSourceToolsets: mocks.openSourceToolsets,
}));
vi.mock('../../lib/sources/resolve', () => ({
  resolveSourcePolicy: mocks.resolveSourcePolicy,
}));
vi.mock('../model', () => ({ researchWithSources: mocks.researchWithSources }));

import { researchSources } from '../agents/research';

const source = {
  id: 'docs',
  label: 'Docs',
  failureMode: 'strict',
  timeoutMs: 1_000,
  toolCallConcurrency: 1,
};

describe('researchSources provenance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses recorder evidence instead of inferring evidence from notes', async () => {
    const evidence = [{ id: 'ev_000000000000000000000000', sourceId: 'docs' }];
    mocks.resolveSourcePolicy.mockReturnValue({
      policy: { mode: 'multiple', sourceIds: ['docs'] },
      sources: [source],
    });
    mocks.openSourceToolsets.mockResolvedValue({
      toolsets: { docs: {} },
      failures: [],
      recorder: { snapshot: () => evidence },
      disconnect: vi.fn(),
    });
    mocks.researchWithSources.mockResolvedValue('Model notes that mention an unrelated source.');

    const result = await researchSources(['docs'], {
      name: 'research',
      instructions: 'research',
      prompt: 'prompt',
    });
    expect(result.evidence).toBe(evidence);
    expect(result.notes).toContain('unrelated source');
  });

  it('fails when selected sources produce no successful tool evidence', async () => {
    mocks.resolveSourcePolicy.mockReturnValue({
      policy: { mode: 'multiple', sourceIds: ['docs'] },
      sources: [source],
    });
    mocks.openSourceToolsets.mockResolvedValue({
      toolsets: { docs: {} },
      failures: [],
      recorder: { snapshot: () => [] },
      disconnect: vi.fn(),
    });
    mocks.researchWithSources.mockResolvedValue('Plausible but ungrounded notes');

    await expect(
      researchSources(['docs'], { name: 'research', instructions: 'research', prompt: 'prompt' }),
    ).rejects.toThrow(/no captured tool evidence/);
  });

  it('fails exclusive best-effort discovery before model invocation with structured failures', async () => {
    const failure = {
      sourceId: 'docs',
      stage: 'discover',
      code: 'unavailable',
      message: 'connection refused',
    };
    mocks.resolveSourcePolicy.mockReturnValue({
      policy: { mode: 'exclusive', sourceIds: ['docs'] },
      sources: [{ ...source, failureMode: 'best-effort' }],
    });
    const disconnect = vi.fn();
    mocks.openSourceToolsets.mockResolvedValue({
      toolsets: {},
      failures: [failure],
      recorder: { snapshot: () => [] },
      disconnect,
    });

    await expect(
      researchSources(['docs'], {
        name: 'research',
        instructions: 'research',
        prompt: 'prompt',
        sourcePolicy: { mode: 'exclusive', sourceIds: ['docs'] },
      }),
    ).rejects.toMatchObject({ failures: [failure] });
    expect(mocks.researchWithSources).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('rejects evidence from another source in exclusive mode', async () => {
    mocks.resolveSourcePolicy.mockReturnValue({
      policy: { mode: 'exclusive', sourceIds: ['docs'] },
      sources: [source],
    });
    mocks.openSourceToolsets.mockResolvedValue({
      toolsets: { docs: {} },
      failures: [],
      recorder: {
        snapshot: () => [{ id: 'ev_000000000000000000000000', sourceId: 'web' }],
      },
      disconnect: vi.fn(),
    });
    mocks.researchWithSources.mockResolvedValue('notes');

    await expect(
      researchSources(['docs'], {
        name: 'research',
        instructions: 'research',
        prompt: 'prompt',
        sourcePolicy: { mode: 'exclusive', sourceIds: ['docs'] },
      }),
    ).rejects.toThrow(/another source/);
  });
});
