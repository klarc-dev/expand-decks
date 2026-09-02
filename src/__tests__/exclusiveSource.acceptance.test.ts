import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ledger: undefined as Record<string, any> | undefined,
  presentation: {
    id: 1,
    title: 'Test deck',
    language: 'fr',
    createdBy: 2,
    organisation: null,
    slides: [],
    tags: [],
  } as Record<string, any>,
  queuedInput: undefined as Record<string, unknown> | undefined,
  workflowInput: undefined as Record<string, unknown> | undefined,
  persistSlides: vi.fn(),
}));

const payload = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: { id: 2, role: 'admin' } })),
  find: vi.fn(async () => ({ docs: [] })),
  findByID: vi.fn(async ({ collection }: { collection: string }) =>
    collection === 'agent-runs' ? state.ledger : state.presentation,
  ),
  create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    state.ledger = { id: 7, attempt: 0, ...data, createdAt: '', updatedAt: '' };
    return state.ledger;
  }),
  update: vi.fn(
    async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      if (collection === 'agent-runs') state.ledger = { ...state.ledger, ...data };
      else state.presentation = { ...state.presentation, ...data };
      return collection === 'agent-runs' ? state.ledger : state.presentation;
    },
  ),
  jobs: {
    queue: vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      state.queuedInput = input;
      return { id: 'job-1' };
    }),
  },
  logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock('payload', () => ({ getPayload: vi.fn(async () => payload) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('../agents/tools/persist', () => ({ persistSlides: state.persistSlides }));
vi.mock('../agents/fonts', () => ({ chooseFontPairForBrief: vi.fn() }));
vi.mock('../agents/mastra', () => ({
  mastra: {
    getWorkflow: () => ({
      createRun: vi.fn(async () => ({
        stream: (opts: { inputData: Record<string, unknown> }) => {
          state.workflowInput = opts.inputData;
          const stream = (async function* () {
            yield { type: 'workflow-step-start', payload: { id: 'gather' } };
          })() as unknown as AsyncIterable<unknown> & { result: Promise<unknown> };
          stream.result = Promise.resolve({
            status: 'success',
            result: {
              slides: [{ blockType: 'statement', title: 'Grounded' }],
              evidence: [
                {
                  id: 'ev_000000000000000000000000',
                  sourceId: 'docs',
                  sourceLabel: 'Docs',
                  claim: 'Fact',
                  excerpt: 'Fact',
                  toolName: 'search',
                  toolCallId: 'call-1',
                  retrievedAt: new Date().toISOString(),
                  contentSha256: '0'.repeat(64),
                },
              ],
              sourceFailures: [],
            },
          });
          return stream;
        },
      })),
    }),
  },
}));

import { POST } from '../app/(payload)/api/agent-draft/route';
import { runAgentDraftTask } from '../jobs/agentDraft';
import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '../lib/sources/registry';

describe('exclusive source admin-to-worker acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ledger = undefined;
    state.queuedInput = undefined;
    state.workflowInput = undefined;
    state.presentation = {
      id: 1,
      title: 'Test deck',
      language: 'fr',
      createdBy: 2,
      organisation: null,
      slides: [],
      tags: [],
    };
    process.env[SOURCE_REGISTRY_ENV] = JSON.stringify([
      {
        id: 'docs',
        label: 'Docs',
        transport: 'http',
        url: 'https://example.com/mcp',
        allowedTools: ['search'],
      },
      {
        id: 'other',
        label: 'Other',
        transport: 'http',
        url: 'https://other.example.com/mcp',
        allowedTools: ['search'],
      },
    ]);
    __resetSourceRegistryForTests();
  });

  it('persists one immutable source policy and executes the queued worker with it', async () => {
    const response = await POST(
      new Request('http://local/api/agent-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          presentationId: 1,
          brief: 'A sufficiently detailed exclusive-source brief',
          sourcePolicy: { mode: 'exclusive', sourceIds: ['docs'] },
        }),
      }) as never,
    );

    expect(response.status).toBe(202);
    expect(state.ledger).toMatchObject({ sourcePolicy: 'exclusive', sourceIds: ['docs'] });
    expect(state.queuedInput).toEqual({ agentRunId: '7', presentationId: '1' });

    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.workflowInput).toMatchObject({ sourcePolicy: 'exclusive', sourceIds: ['docs'] });
    expect(state.ledger).toMatchObject({ status: 'succeeded' });
    expect(state.presentation).toMatchObject({ draftStatus: 'done', draftSources: ['docs'] });
    expect(JSON.stringify(state.workflowInput)).not.toContain('other');
  });
});
