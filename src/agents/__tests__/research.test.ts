import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openSourceToolsets: vi.fn(),
  resolveSources: vi.fn(),
  researchWithSources: vi.fn(),
}));

vi.mock('../../lib/sources/mcpConnector', () => ({
  openSourceToolsets: mocks.openSourceToolsets,
}));
vi.mock('../../lib/sources/resolve', () => ({ resolveSources: mocks.resolveSources }));
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
  it('uses recorder evidence instead of inferring evidence from notes', async () => {
    const evidence = [{ id: 'ev_000000000000000000000000', sourceId: 'docs' }];
    mocks.resolveSources.mockReturnValue([source]);
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
    mocks.resolveSources.mockReturnValue([source]);
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
});
