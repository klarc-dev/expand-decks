import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, getPayload } = vi.hoisted(() => {
  const authMock = vi.fn();
  return { auth: authMock, getPayload: vi.fn(async () => ({ auth: authMock })) };
});

vi.mock('payload', () => ({ getPayload }));
vi.mock('@payload-config', () => ({ default: {} }));

import { GET } from '../route';
import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '@/lib/sources/registry';

const previous = process.env[SOURCE_REGISTRY_ENV];

function request() {
  return new Request('http://localhost/api/agent-sources') as Parameters<typeof GET>[0];
}

function setRegistry(value: unknown) {
  process.env[SOURCE_REGISTRY_ENV] = typeof value === 'string' ? value : JSON.stringify(value);
  __resetSourceRegistryForTests();
}

describe('GET /api/agent-sources', () => {
  beforeEach(() => {
    auth.mockReset();
    getPayload.mockClear();
  });

  afterEach(() => {
    if (previous === undefined) delete process.env[SOURCE_REGISTRY_ENV];
    else process.env[SOURCE_REGISTRY_ENV] = previous;
    __resetSourceRegistryForTests();
  });

  it('requires an authenticated user', async () => {
    auth.mockResolvedValue({ user: null });

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Non authentifié' });
  });

  it('returns source options without server-side connection details', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    setRegistry([
      {
        id: 'private-kb',
        label: 'Private KB',
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        env: { API_KEY: 'secret' },
      },
    ]);

    const res = await GET(request());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      sources: [{ id: 'private-kb', label: 'Private KB' }],
      maxSelected: 8,
    });
  });

  it('soft-fails malformed registry config', async () => {
    auth.mockResolvedValue({ user: { id: 'u1' } });
    setRegistry('{bad json');

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sources).toEqual([]);
    expect(body.maxSelected).toBe(8);
    expect(body.error).toContain('AGENT_SOURCE_REGISTRY_JSON must be a JSON array');
  });
});
