import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, getPayload } = vi.hoisted(() => {
  const authMock = vi.fn();
  return { auth: authMock, getPayload: vi.fn(async () => ({ auth: authMock })) };
});

const { listGoogleFonts } = vi.hoisted(() => ({ listGoogleFonts: vi.fn() }));

vi.mock('payload', () => ({ getPayload }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/googleFonts', () => ({
  FALLBACK_FONTS: [{ family: 'Roboto', category: 'sans-serif' }],
  listGoogleFonts,
}));

import { GET } from '../route';

function request() {
  return new Request('http://localhost/api/google-fonts') as Parameters<typeof GET>[0];
}

describe('GET /api/google-fonts', () => {
  beforeEach(() => {
    auth.mockReset();
    getPayload.mockClear();
    listGoogleFonts.mockReset();
  });

  it('requires authentication', async () => {
    auth.mockResolvedValue({ user: null });

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(listGoogleFonts).not.toHaveBeenCalled();
  });

  it('returns safe font options without API secrets', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    listGoogleFonts.mockResolvedValue({
      live: true,
      fonts: [
        {
          family: 'Noto Sans Display',
          category: 'sans-serif',
          variants: ['regular'],
          subsets: ['latin'],
        },
      ],
    });

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
    await expect(res.json()).resolves.toEqual({
      live: true,
      fonts: [{ family: 'Noto Sans Display', category: 'sans-serif' }],
    });
  });
});
