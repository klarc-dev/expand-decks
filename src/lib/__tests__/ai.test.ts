import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import { forceNonStreamFetch } from '../ai';

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

  it('injects disabled thinking when tools are present without forced tool_choice', async () => {
    await forceNonStreamFetch('https://x/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'cc/x', tools: [{ type: 'function' }] }),
    });

    expect(JSON.parse(capturedBody())).toEqual({
      model: 'cc/x',
      stream: false,
      tools: [{ type: 'function' }],
      thinking: { type: 'disabled' },
    });
  });

  it('passes a non-JSON body through unchanged', async () => {
    await forceNonStreamFetch('https://x/v1/chat/completions', { method: 'POST', body: 'hello' });

    expect(capturedBody()).toBe('hello');
  });
});
