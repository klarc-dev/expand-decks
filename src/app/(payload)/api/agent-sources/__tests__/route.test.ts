import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, find, getPayload } = vi.hoisted(() => {
  const authMock = vi.fn();
  const findMock = vi.fn();
  return {
    auth: authMock,
    find: findMock,
    getPayload: vi.fn(async () => ({ auth: authMock, find: findMock })),
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

function knowledgeBase(
  id: number,
  name: string,
  state: {
    chunkCount?: number;
    documentCount?: number;
  } = {},
) {
  return {
    id,
    name,
    documentCount: state.documentCount ?? 0,
    chunkCount: state.chunkCount ?? 0,
    lastIndexedAt: null,
  };
}

describe('GET /api/agent-sources', () => {
  beforeEach(() => {
    auth.mockReset();
    find.mockReset();
    getPayload.mockClear();
    find.mockResolvedValue({ docs: [] });
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
    expect(find).not.toHaveBeenCalled();
  });

  it('returns accessible knowledge bases beside MCP options without secrets', async () => {
    auth.mockResolvedValue({ user });
    find.mockResolvedValue({
      docs: [
        knowledgeBase(42, 'Contrats', {
          chunkCount: 12,
          documentCount: 2,
        }),
      ],
    });
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

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      sources: [
        { id: 'private-mcp', label: 'Private MCP', kind: 'external' },
        { id: 'knowledge_42', label: 'Contrats', kind: 'knowledge', readiness: 'ready' },
      ],
      maxSelected: 8,
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('command');
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'knowledge-bases',
        user,
        overrideAccess: false,
        depth: 0,
      }),
    );
  });

  it('keeps accessible knowledge bases when the MCP registry is malformed', async () => {
    auth.mockResolvedValue({ user });
    find.mockResolvedValue({ docs: [knowledgeBase(9, 'Procédures')] });
    setRegistry('{bad json');

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sources).toEqual([
      { id: 'knowledge_9', label: 'Procédures', kind: 'knowledge', readiness: 'empty' },
    ]);
    expect(body.maxSelected).toBe(8);
    expect(body.error).toContain('AGENT_SOURCE_REGISTRY_JSON must be a JSON array');
  });

  it('derives empty, failed, and unavailable readiness only from document/index state', async () => {
    auth.mockResolvedValue({ user });
    setRegistry([]);
    find
      .mockResolvedValueOnce({
        docs: [
          knowledgeBase(1, 'Vide'),
          knowledgeBase(2, 'Échecs', { documentCount: 2 }),
          knowledgeBase(3, 'En cours', { documentCount: 2 }),
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          { knowledgeBase: 2, indexingStatus: 'failed' },
          { knowledgeBase: 2, indexingStatus: 'failed' },
          { knowledgeBase: 3, indexingStatus: 'pending' },
          { knowledgeBase: 3, indexingStatus: 'indexing' },
        ],
      });

    const body = await (await GET(request())).json();

    expect(body.sources).toEqual([
      { id: 'knowledge_1', label: 'Vide', kind: 'knowledge', readiness: 'empty' },
      { id: 'knowledge_2', label: 'Échecs', kind: 'knowledge', readiness: 'failed' },
      { id: 'knowledge_3', label: 'En cours', kind: 'knowledge', readiness: 'unavailable' },
    ]);
    expect(JSON.stringify(body)).not.toContain('documents');
    expect(JSON.stringify(body)).not.toContain('indexingStatus');
    expect(JSON.stringify(body)).not.toContain('indexName');
  });

  it('does not memoize knowledge bases', async () => {
    auth.mockResolvedValue({ user });
    setRegistry([]);
    find.mockResolvedValueOnce({ docs: [knowledgeBase(1, 'Initiale')] }).mockResolvedValueOnce({
      docs: [knowledgeBase(1, 'Initiale'), knowledgeBase(2, 'Nouvelle')],
    });

    expect((await (await GET(request())).json()).sources).toHaveLength(1);
    expect((await (await GET(request())).json()).sources).toEqual([
      { id: 'knowledge_1', label: 'Initiale', kind: 'knowledge', readiness: 'empty' },
      { id: 'knowledge_2', label: 'Nouvelle', kind: 'knowledge', readiness: 'empty' },
    ]);
    expect(find).toHaveBeenCalledTimes(2);
  });
});
