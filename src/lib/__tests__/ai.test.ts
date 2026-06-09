import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Mock the AI SDK so draftObject never makes a real call. `tool` is passed
// through (identity) so we can assert the exact tool config draftObject builds;
// `generateText` is a spy whose resolved value drives the contract tests.
const generateText = vi.fn();
vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  tool: (config: unknown) => config,
  TypeValidationError: { isInstance: () => false },
}));

import { draftObject, forceNonStreamFetch } from '../ai';

const schema = z.object({ title: z.string() });

describe('draftObject()', () => {
  afterEach(() => {
    generateText.mockReset();
  });

  it('registers exactly one forced tool named "emit" carrying the passed schema', async () => {
    generateText.mockResolvedValue({ toolCalls: [{ toolName: 'emit', input: { title: 'x' } }] });

    await draftObject({ model: 'cc/test', schema, system: 'sys', prompt: 'p' });

    expect(generateText).toHaveBeenCalledTimes(1);
    const args = generateText.mock.calls[0][0] as {
      tools: Record<string, { inputSchema: unknown }>;
      toolChoice: unknown;
      system: string;
      prompt: string;
    };
    expect(Object.keys(args.tools)).toEqual(['emit']);
    expect(args.tools.emit.inputSchema).toBe(schema);
    expect(args.toolChoice).toEqual({ type: 'tool', toolName: 'emit' });
    expect(args.system).toBe('sys');
    expect(args.prompt).toBe('p');
  });

  it('returns toolCalls[0].input on a valid emit call', async () => {
    const input = { title: 'hello' };
    generateText.mockResolvedValue({ toolCalls: [{ toolName: 'emit', input }] });

    const result = await draftObject({ model: 'cc/test', schema, system: 's', prompt: 'p' });

    expect(result).toEqual(input);
  });

  it('throws when toolCalls is empty', async () => {
    generateText.mockResolvedValue({ toolCalls: [] });

    await expect(
      draftObject({ model: 'cc/test', schema, system: 's', prompt: 'p' }),
    ).rejects.toThrow('Le modèle n’a pas appelé l’outil de génération.');
  });

  it('throws when the first tool call is not "emit"', async () => {
    generateText.mockResolvedValue({ toolCalls: [{ toolName: 'other', input: { title: 'x' } }] });

    await expect(
      draftObject({ model: 'cc/test', schema, system: 's', prompt: 'p' }),
    ).rejects.toThrow('Le modèle n’a pas appelé l’outil de génération.');
  });
});

describe('forceNonStreamFetch()', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const capturedBody = () => fetchSpy.mock.calls[0][1]?.body as string;

  it('injects stream:false into a JSON body that omits the key', async () => {
    await forceNonStreamFetch('https://x/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'cc/x', messages: [] }),
    });

    expect(JSON.parse(capturedBody())).toEqual({ model: 'cc/x', messages: [], stream: false });
  });

  it('leaves a JSON body that already sets stream untouched', async () => {
    const body = JSON.stringify({ model: 'cc/x', stream: true });
    await forceNonStreamFetch('https://x/v1/chat/completions', { method: 'POST', body });

    expect(capturedBody()).toBe(body);
    expect(JSON.parse(capturedBody())).toEqual({ model: 'cc/x', stream: true });
  });

  it('passes a non-JSON body through unchanged', async () => {
    await forceNonStreamFetch('https://x/v1/chat/completions', { method: 'POST', body: 'hello' });

    expect(capturedBody()).toBe('hello');
  });
});
