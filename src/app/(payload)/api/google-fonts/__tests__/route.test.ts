import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, getPayload } = vi.hoisted(() => {
  const authMock = vi.fn();
  return { auth: authMock, getPayload: vi.fn(async () => ({ auth: authMock })) };
});

const { listGoogleFonts, TestUnavailableError } = vi.hoisted(() => ({
  listGoogleFonts: vi.fn(),
  TestUnavailableError: class TestUnavailableError extends Error {},
}));

vi.mock('payload', () => ({ getPayload }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/googleFonts', () => ({
  LOCAL_FONTS: [{ family: 'Gilroy', category: 'sans-serif' }],
  GoogleFontsUnavailableError: TestUnavailableError,
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

  it('returns local plus live font options without API secrets', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    listGoogleFonts.mockResolvedValue([
      {
        family: 'Noto Sans Display',
        category: 'sans-serif',
        variants: ['regular'],
        subsets: ['latin'],
      },
    ]);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
    await expect(res.json()).resolves.toEqual({
      fonts: [
        { family: 'Gilroy', category: 'sans-serif' },
        { family: 'Noto Sans Display', category: 'sans-serif' },
      ],
    });
  });

  it('answers 503 when the catalog is unavailable', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    listGoogleFonts.mockRejectedValue(new TestUnavailableError('GOOGLE_FONTS_API_KEY is not set'));

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'GOOGLE_FONTS_API_KEY is not set' });
  });
});
