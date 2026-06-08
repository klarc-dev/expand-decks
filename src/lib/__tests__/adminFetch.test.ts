import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminPost } from '../adminFetch';

describe('adminPost()', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  const jsonResponse = (status: number, body: unknown, ok = status < 400) =>
    ({
      ok,
      status,
      json: () => Promise.resolve(body),
    }) as unknown as Response;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a JSON body with Content-Type when a body is provided', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, {}));

    await adminPost('/api/x', { a: 1 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });
  });

  it('omits Content-Type and body when no body is provided', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, {}));

    await adminPost('/api/x');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('returns ok/status/parsed-data on a successful response', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { shareUrl: 'https://x/abc' }));

    const result = await adminPost('/api/x');

    expect(result).toEqual({ ok: true, status: 200, data: { shareUrl: 'https://x/abc' } });
  });

  it('returns ok:false with the parsed error body on a failed response', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(400, { error: 'x' }));

    const result = await adminPost('/api/x', { a: 1 });

    expect(result).toEqual({ ok: false, status: 400, data: { error: 'x' } });
  });

  it('defaults data to {} when the response body is not valid JSON', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    } as unknown as Response);

    const result = await adminPost('/api/x', { a: 1 });

    expect(result).toEqual({ ok: false, status: 500, data: {} });
  });
});
