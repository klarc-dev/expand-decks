import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, getPayload } = vi.hoisted(() => {
  const authMock = vi.fn();
  return {
    auth: authMock,
    getPayload: vi.fn(async () => ({ auth: authMock })),
  };
});

vi.mock('payload', () => ({ getPayload }));
vi.mock('@payload-config', () => ({ default: {} }));

import { GET } from '../route';
import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '@/lib/sources/registry';

const previous = process.env[SOURCE_REGISTRY_ENV];
const user = { id: 7, role: 'author' };

function request() {
  return new Request('http://localhost/api/agent-sources') as Parameters<typeof GET>[0];
}

function setRegistry(value: unknown) {
  process.env[SOURCE_REGISTRY_ENV] = typeof value === 'string' ? value : JSON.stringify(value);
  __resetSourceRegistryForTests();
}

describe('GET /api/agent-sources', () => {
  beforeEach(() => auth.mockReset());

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

  it('returns only external MCP options without limits or secrets', async () => {
    auth.mockResolvedValue({ user });
    setRegistry([
      {
        id: 'private-mcp',
        label: 'Private MCP',
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        env: { API_KEY: 'secret' },
        allowedTools: ['search'],
      },
    ]);

    const body = await (await GET(request())).json();
    expect(body).toEqual({
      sources: [{ id: 'private-mcp', label: 'Private MCP', kind: 'external' }],
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('command');
    expect(JSON.stringify(body)).not.toContain('maxSelected');
    expect(JSON.stringify(body)).not.toContain('knowledge');
  });

  it('surfaces an invalid registry while returning an empty option list', async () => {
    auth.mockResolvedValue({ user });
    setRegistry('{bad json');

    const body = await (await GET(request())).json();
    expect(body.sources).toEqual([]);
    expect(body.error).toContain('AGENT_SOURCE_REGISTRY_JSON must be a JSON array');
  });
});
