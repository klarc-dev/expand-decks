import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));

vi.mock('@mastra/core/agent', () => ({
  Agent: vi.fn().mockImplementation(function Agent() {
    return { generate: generateMock };
  }),
}));

vi.mock('@mastra/core/tools', () => ({
  createTool: vi.fn((tool) => tool),
}));

vi.mock('../../lib/ai', () => ({
  DRAFT_MODEL: 'test-model',
  modelForTier: () => 'test-model',
  cloudCLIProxy: vi.fn(() => ({})),
}));

import { z } from 'zod';
import sharp from 'sharp';
import { scoreVisual } from '../scorers/visual';
import { generateStructured, researchWithSources } from '../model';

describe('scoreVisual image boundary', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('bounds raw rendered PNGs before sending them to the model', async () => {
    // Given: a caller passes an unbounded rendered PNG into the public visual scorer.
    const input = await sharp({
      create: {
        width: 2000,
        height: 1200,
        channels: 3,
        background: '#f8fafc',
      },
    })
      .png()
      .toBuffer();
    generateMock.mockResolvedValue({
      finishReason: 'tool-calls',
      toolCalls: [
        {
          payload: { toolName: 'emit', args: { score: 1, flags: [], fix: '' } },
        },
      ],
    });

    // When: the scorer runs through the model boundary.
    await expect(
      scoreVisual(
        { blockType: 'cover', title: 'Title' },
        { base64: input.toString('base64'), mimeType: 'image/png' },
      ),
    ).resolves.toEqual({ score: 1, fix: '' });

    // Then: the model receives a JPEG data URL instead of the raw PNG payload.
    const calls = generateMock.mock.calls;
    expect(calls).toHaveLength(1);
    const messages = calls[0]?.[0];
    expect(JSON.stringify(messages)).toContain('data:image/jpeg;base64,');
    expect(JSON.stringify(messages)).not.toContain('data:image/png;base64,');
  });
});

describe('generateStructured image inputs', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('requires an explicit role for non-canonical invocation names', async () => {
    await expect(
      generateStructured({
        name: 'unknown',
        instructions: 'Return data',
        schema: z.object({ ok: z.boolean() }),
        prompt: 'go',
        maxRepairs: 0,
      }),
    ).rejects.toThrow(/no registered Mastra agent role/);
  });

  it('preserves explicit image MIME types in multimodal inputs', async () => {
    generateMock.mockResolvedValue({
      finishReason: 'tool-calls',
      toolCalls: [{ payload: { toolName: 'emit', args: { ok: true } } }],
    });

    await expect(
      generateStructured({
        name: 'test',
        instructions: 'Return data',
        schema: z.object({ ok: z.boolean() }),
        prompt: 'go',
        images: [{ base64: 'abc', mimeType: 'image/jpeg' }],
        agentRole: 'writer',
        maxRepairs: 0,
      }),
    ).resolves.toEqual({ ok: true });

    expect(generateMock).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'go' },
            {
              type: 'image',
              image: 'data:image/jpeg;base64,abc',
              mediaType: 'image/jpeg',
            },
          ],
        },
      ],
      expect.objectContaining({
        clientTools: expect.objectContaining({ emit: expect.any(Object) }),
        toolChoice: { type: 'tool', toolName: 'emit' },
        maxSteps: 1,
      }),
    );
  });
});

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
        agentRole: 'writer',
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
        agentRole: 'writer',
        maxRepairs: 0,
      }),
    ).resolves.toEqual({ ok: true });
  });
});

describe('generateStructured determinism', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('pins judge sampling so an eval verdict is reproducible', async () => {
    generateMock.mockResolvedValue({
      finishReason: 'tool-calls',
      toolCalls: [{ payload: { toolName: 'emit', args: { ok: true } } }],
    });

    await generateStructured({
      name: 'eval:test',
      instructions: 'Judge it',
      schema: z.object({ ok: z.boolean() }),
      prompt: 'go',
      modelTier: 'judge',
      maxRepairs: 0,
    });

    // A judge that resamples cannot gate anything: the same deck must score the
    // same way twice, so sampling is pinned rather than left provider-default.
    expect(generateMock.mock.calls[0]![1]).toMatchObject({
      modelSettings: { temperature: 0, seed: expect.any(Number) },
    });
  });

  it('leaves creative tiers unpinned so drafting stays varied', async () => {
    generateMock.mockResolvedValue({
      finishReason: 'tool-calls',
      toolCalls: [{ payload: { toolName: 'emit', args: { ok: true } } }],
    });

    await generateStructured({
      name: 'draft:test',
      instructions: 'Write it',
      schema: z.object({ ok: z.boolean() }),
      prompt: 'go',
      modelTier: 'draft',
      agentRole: 'writer',
      maxRepairs: 0,
    });

    expect(generateMock.mock.calls[0]![1]).not.toHaveProperty('modelSettings');
  });

  it('advances the seed across repairs so a pinned judge can escape a bad draw', async () => {
    // Even a pinned tier must not re-roll the SAME invalid output forever:
    // each repair attempt gets its own seed, so the sequence stays
    // reproducible while still being able to recover.
    generateMock
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { ok: 'nope' } } }],
      })
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { ok: true } } }],
      });

    await expect(
      generateStructured({
        name: 'eval:test',
        instructions: 'Judge it',
        schema: z.object({ ok: z.boolean() }),
        prompt: 'go',
        modelTier: 'judge',
        maxRepairs: 1,
      }),
    ).resolves.toEqual({ ok: true });

    const first = generateMock.mock.calls[0]![1].modelSettings.seed;
    const second = generateMock.mock.calls[1]![1].modelSettings.seed;
    expect(second).not.toBe(first);
  });
});

describe('generateStructured schema repair', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('tells the model the actual length so an over-long field can be shortened', async () => {
    // A repair that only says "too big" leaves the model guessing by how much,
    // so it re-emits a value that is still over the limit. Observed live: a
    // `primaryAction` and a `subtitle` that never recovered and failed the run.
    generateMock
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { action: 'x'.repeat(64) } } }],
      })
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { action: 'ok' } } }],
      });

    await generateStructured({
      name: 'writer:cta',
      instructions: 'Write it',
      schema: z.object({ action: z.string().max(50) }),
      prompt: 'go',
      maxRepairs: 1,
    });

    const repairPrompt = String(generateMock.mock.calls[1]![0]);
    expect(repairPrompt).toContain('64');
    expect(repairPrompt).toContain('50');
  });

  it('retries an over-long field more than once before giving up', async () => {
    // One repair is not enough in practice: the model often overshoots twice.
    generateMock
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { action: 'x'.repeat(80) } } }],
      })
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { action: 'y'.repeat(60) } } }],
      })
      .mockResolvedValueOnce({
        finishReason: 'tool-calls',
        toolCalls: [{ payload: { toolName: 'emit', args: { action: 'fits' } } }],
      });

    await expect(
      generateStructured({
        name: 'writer:cta',
        instructions: 'Write it',
        schema: z.object({ action: z.string().max(50) }),
        prompt: 'go',
      }),
    ).resolves.toEqual({ action: 'fits' });
  });
});

describe('researchWithSources', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('passes toolsets with multiple steps and requires a source tool call', async () => {
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
    expect(generateMock.mock.calls[0]![1]).toHaveProperty('toolChoice', 'required');
  });
});
