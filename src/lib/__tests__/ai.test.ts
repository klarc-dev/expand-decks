import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import { forceNonStreamFetch } from '../ai';

describe('CloudCLIProxy configuration', () => {
  it('supports the same CLIPROXYAPI ckey environment used by Hermes', async () => {
    vi.resetModules();
    vi.stubEnv('CLIPROXYAPI_BASE_URL', 'https://proxy.example/v1');
    vi.stubEnv('CLIPROXYAPI_KEY', 'shared-ckey');
    vi.stubEnv('OPENAI_BASE_URL', 'https://wrong.example/v1');
    vi.stubEnv('OPENAI_API_KEY', 'wrong-key');

    const { cloudCLIProxy } = await import('../ai');
    const model = cloudCLIProxy('high') as unknown as {
      config: {
        url: (options: { path: string; modelId: string }) => string;
        headers: () => Record<string, string>;
      };
    };

    expect(model.config.url({ path: '/chat/completions', modelId: 'high' })).toBe(
      'https://proxy.example/v1/chat/completions',
    );
    const headers = model.config.headers();
    expect(headers.authorization ?? headers.Authorization).toBe('Bearer shared-ckey');

    vi.unstubAllEnvs();
    vi.resetModules();
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
      body: JSON.stringify({ model: 'high', messages: [] }),
    });

    expect(JSON.parse(capturedBody())).toEqual({ model: 'high', messages: [], stream: false });
  });

  it('leaves a JSON body that already sets stream untouched', async () => {
    const body = JSON.stringify({ model: 'high', stream: true });
    await forceNonStreamFetch('https://x/v1/chat/completions', { method: 'POST', body });

    expect(capturedBody()).toBe(body);
    expect(JSON.parse(capturedBody())).toEqual({ model: 'high', stream: true });
  });

  it('does not add provider-specific fields when tools are present', async () => {
    await forceNonStreamFetch('https://x/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'high', tools: [{ type: 'function' }] }),
    });

    expect(JSON.parse(capturedBody())).toEqual({
      model: 'high',
      stream: false,
      tools: [{ type: 'function' }],
    });
  });

  it('passes a non-JSON body through unchanged', async () => {
    await forceNonStreamFetch('https://x/v1/chat/completions', { method: 'POST', body: 'hello' });

    expect(capturedBody()).toBe('hello');
  });
});
