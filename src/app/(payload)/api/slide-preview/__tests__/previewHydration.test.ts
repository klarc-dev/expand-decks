import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, findByID, getPayload } = vi.hoisted(() => {
  const authMock = vi.fn();
  const findByIDMock = vi.fn();
  return {
    auth: authMock,
    findByID: findByIDMock,
    getPayload: vi.fn(async () => ({ auth: authMock, findByID: findByIDMock })),
  };
});

vi.mock('payload', () => ({ getPayload }));
vi.mock('@payload-config', () => ({ default: {} }));

import { POST } from '../route';
import { __resetPreviewHydrationCacheForTests } from '@/lib/previewHydrationCache';

function request(body: unknown) {
  return new Request('http://localhost/api/slide-preview', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

const coverBody = (userId: string) => ({
  presentationId: 'p1',
  block: {
    blockType: 'cover',
    title: 'Cover',
    intervenants: [{ user: 42 }],
  },
  previewFieldPath: 'slides.0.preview',
});

describe('POST /api/slide-preview hydration + access', () => {
  beforeEach(() => {
    auth.mockReset();
    findByID.mockReset();
    getPayload.mockClear();
    __resetPreviewHydrationCacheForTests();
  });

  afterEach(() => {
    __resetPreviewHydrationCacheForTests();
  });

  it('returns 401 without an authenticated user and reads no cache data', async () => {
    auth.mockResolvedValue({ user: null });

    const res = await POST(request(coverBody('u1')));

    expect(res.status).toBe(401);
    expect(findByID).not.toHaveBeenCalled();
  });

  it('returns 400 when presentationId is missing', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });

    const res = await POST(
      request({
        block: { blockType: 'section', title: 'X' },
        previewFieldPath: 'slides.0.preview',
      }),
    );

    expect(res.status).toBe(400);
    expect(findByID).not.toHaveBeenCalled();
  });

  it('returns 404 when the user cannot read the presentation', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    findByID.mockRejectedValueOnce(new Error('forbidden'));

    const res = await POST(request(coverBody('u1')));

    expect(res.status).toBe(404);
  });

  it('hydrates a cover intervenant only once inside the TTL for the same user', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    // 1st call: presentation read; 2nd: user hydration. Later requests reuse cache.
    findByID.mockImplementation(async ({ collection }: { collection: string }) => {
      if (collection === 'presentations') return { id: 'p1' };
      return { id: 42, name: 'Speaker' };
    });

    const first = await POST(request(coverBody('u1')));
    const second = await POST(request(coverBody('u1')));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const userReads = findByID.mock.calls.filter(([a]) => a.collection === 'users');
    expect(userReads).toHaveLength(1);
    expect(first.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('does not cross hydration cache between different authenticated users', async () => {
    findByID.mockImplementation(async ({ collection }: { collection: string }) => {
      if (collection === 'presentations') return { id: 'p1' };
      return { id: 42, name: 'Speaker' };
    });

    auth.mockResolvedValue({ user: { id: 'u1' } });
    await POST(request(coverBody('u1')));
    auth.mockResolvedValue({ user: { id: 'u2' } });
    await POST(request(coverBody('u2')));

    const userReads = findByID.mock.calls.filter(([a]) => a.collection === 'users');
    expect(userReads).toHaveLength(2);
  });
});
