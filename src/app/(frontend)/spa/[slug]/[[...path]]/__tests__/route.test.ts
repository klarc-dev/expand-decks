import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, count } = vi.hoisted(() => ({ auth: vi.fn(), count: vi.fn() }));
const { serveSpaFile } = vi.hoisted(() => ({ serveSpaFile: vi.fn() }));

vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ auth, count })) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/spaFiles', () => ({ serveSpaFile }));

import { NextResponse } from 'next/server';

import { GET } from '../route';

const params = (slug = 'deck', path: string[] = []) => Promise.resolve({ slug, path });

async function textOf(response: Response) {
  return response.text();
}

describe('/spa/[slug] access boundary', () => {
  beforeEach(() => {
    auth.mockReset();
    count.mockReset();
    serveSpaFile.mockReset();
    serveSpaFile.mockResolvedValue(new NextResponse('ok', { status: 200 }));
  });

  it('serves SPA files when the authenticated user can read the presentation', async () => {
    auth.mockResolvedValue({ user: { id: 'u1', role: 'author' } });
    count.mockResolvedValueOnce({ totalDocs: 1 });

    const response = await GET(new Request('http://test'), {
      params: params('deck', ['assets', 'app.js']),
    });

    expect(response.status).toBe(200);
    expect(serveSpaFile).toHaveBeenCalledWith('deck', ['assets', 'app.js']);
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false, user: { id: 'u1', role: 'author' } }),
    );
  });

  it('returns 403 for anonymous requests before reading any file', async () => {
    auth.mockResolvedValue({ user: null });

    const response = await GET(new Request('http://test'), { params: params('deck') });

    expect(response.status).toBe(403);
    expect(await textOf(response)).toBe('Forbidden');
    expect(count).not.toHaveBeenCalled();
    expect(serveSpaFile).not.toHaveBeenCalled();
  });

  it('returns 403 when the presentation exists but is not readable by the user', async () => {
    auth.mockResolvedValue({ user: { id: 'u2', role: 'author' } });
    count.mockResolvedValueOnce({ totalDocs: 0 }).mockResolvedValueOnce({ totalDocs: 1 });

    const response = await GET(new Request('http://test'), { params: params('deck') });

    expect(response.status).toBe(403);
    expect(await textOf(response)).toBe('Forbidden');
    expect(serveSpaFile).not.toHaveBeenCalled();
  });

  it('returns 404 when no presentation has the slug', async () => {
    auth.mockResolvedValue({ user: { id: 'u2', role: 'author' } });
    count.mockResolvedValueOnce({ totalDocs: 0 }).mockResolvedValueOnce({ totalDocs: 0 });

    const response = await GET(new Request('http://test'), { params: params('missing') });

    expect(response.status).toBe(404);
    expect(await textOf(response)).toBe('Not found');
    expect(serveSpaFile).not.toHaveBeenCalled();
  });
});
