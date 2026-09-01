import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
  queue: vi.fn(),
  cancelByID: vi.fn(),
  getWorkflowRunById: vi.fn(),
  createRun: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    auth: mocks.auth,
    find: mocks.find,
    findByID: mocks.findByID,
    update: mocks.update,
    jobs: { queue: mocks.queue, cancelByID: mocks.cancelByID },
  })),
}));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('../mastra', () => ({
  mastra: {
    getWorkflow: () => ({
      getWorkflowRunById: mocks.getWorkflowRunById,
      createRun: mocks.createRun,
    }),
  },
}));

import { GET, POST } from '../../app/(payload)/api/agent-draft/[runId]/route';

const ledger = {
  id: 7,
  presentation: 1,
  createdBy: 2,
  mastraRunId: 'r1',
  payloadJobId: 'job-1',
  requestId: 'request-1',
  traceId: '0123456789abcdef0123456789abcdef',
  command: 'start',
  mode: 'replace',
  brief: 'A sufficiently long test brief',
  language: 'fr',
  inputFingerprint: 'fingerprint',
  events: [],
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

function request(body: unknown) {
  return new Request('http://local/api/agent-draft/r1', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 2, role: 'admin' } });
  mocks.find.mockResolvedValue({ docs: [ledger] });
  mocks.findByID.mockResolvedValue({ id: 1, createdBy: 2, draftEvents: [] });
  mocks.getWorkflowRunById.mockResolvedValue({ status: 'running' });
  mocks.queue.mockResolvedValue({ id: 'job-2' });
  mocks.createRun.mockResolvedValue({ cancel: mocks.cancel });
});

describe('agent run recovery API', () => {
  it('reports an expired worker heartbeat as stale', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        {
          ...ledger,
          status: 'running',
          heartbeatAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        },
      ],
    });

    const response = await GET(new Request('http://local/api/agent-draft/r1') as never, {
      params: Promise.resolve({ runId: 'r1' }),
    });
    expect(response).toBeDefined();
    expect(await response!.json()).toEqual(expect.objectContaining({ status: 'stale' }));
  });

  it('rejects restart while the durable heartbeat is fresh', async () => {
    mocks.find.mockResolvedValue({
      docs: [{ ...ledger, status: 'running', heartbeatAt: new Date().toISOString() }],
    });

    const response = await POST(request({ action: 'restart' }), {
      params: Promise.resolve({ runId: 'r1' }),
    });

    expect(response).toBeDefined();
    expect(response!.status).toBe(409);
    expect(mocks.queue).not.toHaveBeenCalled();
  });

  it('queues restart for a stale active run through the existing ledger row', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        {
          ...ledger,
          status: 'running',
          heartbeatAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        },
      ],
    });

    const response = await POST(request({ action: 'restart' }), {
      params: Promise.resolve({ runId: 'r1' }),
    });

    expect(response).toBeDefined();
    expect(response!.status).toBe(202);
    expect(mocks.queue).toHaveBeenCalledWith({
      task: 'agentDraft',
      input: { agentRunId: '7', presentationId: '1' },
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'agent-runs',
        id: 7,
        data: expect.objectContaining({ command: 'restart', status: 'queued' }),
      }),
    );
  });

  it('queues approval resume only for a suspended run', async () => {
    mocks.find.mockResolvedValue({ docs: [{ ...ledger, status: 'suspended' }] });

    const response = await POST(request({ action: 'resume', approved: true }), {
      params: Promise.resolve({ runId: 'r1' }),
    });

    expect(response).toBeDefined();
    expect(response!.status).toBe(202);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          command: 'resume',
          resumeDecision: { approved: true },
          status: 'queued',
        }),
      }),
    );
  });

  it('cancels both the Mastra run and the queued Payload job', async () => {
    mocks.find.mockResolvedValue({ docs: [{ ...ledger, status: 'running' }] });

    const response = await POST(request({ action: 'cancel' }), {
      params: Promise.resolve({ runId: 'r1' }),
    });

    expect(response).toBeDefined();
    expect(response!.status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledOnce();
    expect(mocks.cancelByID).toHaveBeenCalledWith({ id: 'job-1', overrideAccess: true });
  });
});
