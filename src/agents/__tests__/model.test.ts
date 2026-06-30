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
      toolCalls: [{ payload: { toolName: 'emit', args: { score: 1, flags: [], fix: '' } } }],
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
        maxRepairs: 0,
      }),
    ).resolves.toEqual({ ok: true });

    expect(generateMock).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'go' },
            { type: 'image', image: 'data:image/jpeg;base64,abc', mediaType: 'image/jpeg' },
          ],
        },
      ],
      expect.objectContaining({ toolChoice: 'required', maxSteps: 1 }),
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
