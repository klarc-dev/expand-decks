import { beforeEach, expect, it, vi } from 'vitest';
const { rest, auth } = vi.hoisted(() => ({ rest: vi.fn(), auth: vi.fn() }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }));
vi.mock('@payloadcms/next/routes', () => ({ REST_GET: () => rest, REST_OPTIONS: () => vi.fn() }));
import { GET } from '../route';
const request = (headers: HeadersInit) => new Request('https://slides.example/api/media/file/deck.pdf?download=1', { headers });
const context = { params: Promise.resolve({ filename: 'deck.pdf' }) };
beforeEach(() => { vi.resetAllMocks(); rest.mockResolvedValue(new Response(null, { status: 403 })); });
it('sends anonymous PDF navigations to login with the original local destination', async () => {
  auth.mockResolvedValue({ user: null });
  const res = await GET(request({ 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' }), context);
  expect(res.status).toBe(307);
  expect(res.headers.get('location')).toBe('/admin/login?redirect=%2Fapi%2Fmedia%2Ffile%2Fdeck.pdf%3Fdownload%3D1');
  expect(await rest.mock.calls[0]?.[1].params).toEqual({ slug: ['media','file','deck.pdf'] });
});
it('keeps an authenticated denial, even on navigation', async () => {
  auth.mockResolvedValue({ user: { id: 1 } });
  expect((await GET(request({ accept: 'text/html' }), context)).status).toBe(403);
});
it('does not redirect API and embedded requests', async () => {
  for (const headers of [new Headers({ accept: 'application/json' }), new Headers({ 'sec-fetch-mode': 'cors', accept: 'text/html' }), new Headers({ 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'image' })]) {
    expect((await GET(request(headers), context)).status).toBe(403);
  }
  expect(auth).not.toHaveBeenCalled();
});
it('preserves file responses, including partial content and not found', async () => {
  for (const status of [200,206,404]) {
    const original = new Response(null, { status }); rest.mockResolvedValueOnce(original);
    expect(await GET(request({ accept: 'text/html' }), context)).toBe(original);
  }
  expect(auth).not.toHaveBeenCalled();
});
