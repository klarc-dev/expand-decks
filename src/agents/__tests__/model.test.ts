import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateMock = vi.fn();

vi.mock('@mastra/core/agent', () => ({
  Agent: vi.fn().mockImplementation(function Agent() {
    return { generate: generateMock };
  }),
}));

vi.mock('@mastra/core/tools', () => ({
  createTool: vi.fn((tool) => tool),
}));

vi.mock('../../lib/ai', () => ({
  DRAFT_MODEL: 'test/model',
  nineRouter: vi.fn(() => ({})),
}));

import { z } from 'zod';
import { generateStructured, researchWithSources } from '../model';

describe('generateStructured emit tool selection', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('rejects a response that does not call the emit tool', async () => {
    generateMock.mockResolvedValue({
      finishReason: 'tool-calls',
      toolCalls: [{ payload: { toolName: 'other', args: { ok: true } } }],
    });

    await expect(
      generateStructured({
        name: 'test',
        instructions: 'Return data',
        schema: z.object({ ok: z.boolean() }),
        prompt: 'go',
        maxRepairs: 0,
      }),
    ).rejects.toThrow(/emit tool/);
  });

  it('parses args from the named emit tool even when another tool call is present first', async () => {
    generateMock.mockResolvedValue({
      finishReason: 'tool-calls',
      toolCalls: [
        { payload: { toolName: 'other', args: { ok: false } } },
        { payload: { toolName: 'emit', args: { ok: true } } },
      ],
    });

    await expect(
      generateStructured({
        name: 'test',
        instructions: 'Return data',
        schema: z.object({ ok: z.boolean() }),
        prompt: 'go',
        maxRepairs: 0,
      }),
    ).resolves.toEqual({ ok: true });
  });
});

describe('researchWithSources', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('passes toolsets with multiple steps and does not force tool choice', async () => {
    generateMock.mockResolvedValue({ text: 'research notes' });

    await expect(
      researchWithSources({
        name: 'research',
        instructions: 'Use sources',
        prompt: 'find facts',
        toolsets: { source: {} },
        maxSteps: 4,
      }),
    ).resolves.toBe('research notes');

    expect(generateMock).toHaveBeenCalledWith(
      'find facts',
      expect.objectContaining({
        toolsets: { source: {} },
        maxSteps: 4,
      }),
    );
    expect(generateMock.mock.calls[0]![1]).not.toHaveProperty('toolChoice');
  });
});
