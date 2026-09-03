import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  queue: vi.fn(),
}));

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    auth: mocks.auth,
    find: mocks.find,
    findByID: mocks.findByID,
    create: mocks.create,
    update: mocks.update,
    jobs: { queue: mocks.queue },
  })),
}));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/jobs/agentDraft', () => ({ AGENT_DRAFT_TASK: 'agentDraft' }));

import { POST } from '../route';
import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '@/lib/sources/registry';

function request(body: unknown) {
  return new Request('http://local/api/agent-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

const base = { presentationId: 1, brief: 'A sufficiently detailed deck brief' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 2, role: 'admin' } });
  mocks.findByID.mockResolvedValue({ id: 1, createdBy: 2, language: 'fr', slides: [] });
  mocks.find.mockResolvedValue({ docs: [] });
  mocks.create.mockResolvedValue({ id: 7 });
  mocks.queue.mockResolvedValue({ id: 'job-1' });
  process.env[SOURCE_REGISTRY_ENV] = JSON.stringify([
    {
      id: 'docs',
      label: 'Docs',
      transport: 'http',
      url: 'https://example.com/mcp',
      allowedTools: ['search'],
    },
    {
      id: 'web',
      label: 'Web',
      transport: 'http',
      url: 'https://web.example.com/mcp',
      allowedTools: ['search'],
    },
  ]);
  __resetSourceRegistryForTests();
});

describe('agent draft source policy API', () => {
  it('rejects unauthenticated requests', async () => {
    mocks.auth.mockResolvedValue({ user: null });
    expect((await POST(request(base))).status).toBe(401);
  });

  it.each([
    [{ mode: 'exclusive', sourceIds: [] }, 'exactly one source'],
    [{ mode: 'exclusive', sourceIds: ['docs', 'web'] }, 'exactly one source'],
    [{ mode: 'exclusive', sourceIds: ['unknown'] }, 'Unknown source'],
  ])('rejects invalid exclusive policy %j', async (sourcePolicy, error) => {
    const response = await POST(request({ ...base, sourcePolicy }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(error);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects an inaccessible knowledge base as an unknown source with HTTP 400', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 2, role: 'author' } });
    mocks.find.mockResolvedValue({ docs: [] });

    const response = await POST(
      request({ ...base, sourcePolicy: { mode: 'exclusive', sourceIds: ['knowledge_99'] } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unknown source id(s): knowledge_99' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('normalizes and persists a valid exclusive policy', async () => {
    const response = await POST(
      request({ ...base, sourcePolicy: { mode: 'exclusive', sourceIds: [' docs '] } }),
    );
    expect(response.status).toBe(202);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourcePolicy: 'exclusive', sourceIds: ['docs'] }),
      }),
    );
  });

  it('preserves legacy none and multiple requests', async () => {
    expect((await POST(request(base))).status).toBe(202);
    expect(mocks.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourcePolicy: 'none', sourceIds: [] }),
      }),
    );
    expect((await POST(request({ ...base, sourceIds: ['docs', 'web'] }))).status).toBe(202);
    expect(mocks.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourcePolicy: 'multiple', sourceIds: ['docs', 'web'] }),
      }),
    );
  });
});
