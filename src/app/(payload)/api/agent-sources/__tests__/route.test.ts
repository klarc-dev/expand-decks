import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const user = { id: 7, role: 'author' };

function request() {
  return new Request('http://localhost/api/agent-sources') as Parameters<typeof GET>[0];
}

function knowledgeBase(id: number, name: string, readiness = 'empty') {
  return { id, name, readiness };
}

describe('GET /api/agent-sources', () => {
  beforeEach(() => {
    auth.mockReset();
    find.mockReset();
    getPayload.mockClear();
    find.mockResolvedValue({ docs: [] });
  });

  it('requires an authenticated user', async () => {
    auth.mockResolvedValue({ user: null });

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Non authentifié' });
    expect(find).not.toHaveBeenCalled();
  });

  it('returns accessible knowledge bases', async () => {
    auth.mockResolvedValue({ user });
    find.mockResolvedValueOnce({ docs: [knowledgeBase(42, 'Contrats', 'ready')] });

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      sources: [{ id: 'knowledge_42', label: 'Contrats', kind: 'knowledge', readiness: 'ready' }],
      maxSelected: 8,
    });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'knowledge-bases',
        user,
        overrideAccess: false,
        depth: 0,
      }),
    );
  });

  it('exposes the stored readiness of each base without leaking document state', async () => {
    auth.mockResolvedValue({ user });
    find.mockResolvedValueOnce({
      docs: [
        knowledgeBase(1, 'Vide'),
        knowledgeBase(2, 'Échecs', 'failed'),
        knowledgeBase(3, 'En cours', 'unavailable'),
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
