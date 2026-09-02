import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { find, getPayload } = vi.hoisted(() => {
  const findMock = vi.fn();
  return { find: findMock, getPayload: vi.fn(async () => ({ find: findMock })) };
});

vi.mock('payload', () => ({ getPayload }));
vi.mock('@payload-config', () => ({ default: {} }));

import { GET } from '../route';

const originalCommit = process.env.APP_COMMIT;

describe('GET /api/health', () => {
  beforeEach(() => {
    find.mockReset();
    getPayload.mockClear();
    process.env.APP_COMMIT = '0123456789abcdef0123456789abcdef01234567';
  });

  afterEach(() => {
    if (originalCommit === undefined) delete process.env.APP_COMMIT;
    else process.env.APP_COMMIT = originalCommit;
  });

  it('returns the running application version and source commit when healthy', async () => {
    find.mockResolvedValue({ docs: [] });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: '1.0.0',
      commit: '0123456789abcdef0123456789abcdef01234567',
    });
  });

  it('retains deployment identity when the database check fails', async () => {
    find.mockRejectedValue(new Error('database unavailable'));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'error',
      version: '1.0.0',
      commit: '0123456789abcdef0123456789abcdef01234567',
    });
  });
});
