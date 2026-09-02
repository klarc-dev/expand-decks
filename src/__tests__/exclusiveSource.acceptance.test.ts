import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ledger: undefined as Record<string, any> | undefined,
  presentation: {} as Record<string, any>,
  queuedInput: undefined as Record<string, unknown> | undefined,
  openedSourceIds: [] as string[],
  evidence: [] as Record<string, unknown>[],
  sourceFailures: [] as Record<string, unknown>[],
  modelCalls: [] as string[],
  persistSlides: vi.fn(),
  workflowRuns: new Map<string, any>(),
}));

const payload = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: { id: 2, role: 'admin' } })),
  find: vi.fn(async ({ collection }: { collection?: string }) => ({
    docs: collection === 'agent-runs' && state.ledger ? [state.ledger] : [],
  })),
  findByID: vi.fn(async ({ collection }: { collection: string }) =>
    collection === 'agent-runs' ? state.ledger : state.presentation,
  ),
  create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    state.ledger = { id: 7, attempt: 0, ...data, createdAt: '', updatedAt: '' };
    return state.ledger;
  }),
  update: vi.fn(
    async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      if (collection === 'agent-runs') {
        const hook = AgentRuns.hooks?.beforeChange?.[0];
        const checked = hook
          ? await hook({
              collection: AgentRuns,
              context: {},
              data,
              operation: 'update',
              originalDoc: state.ledger,
              req: {} as never,
            } as never)
          : data;
        state.ledger = { ...state.ledger, ...checked };
      } else state.presentation = { ...state.presentation, ...data };
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

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>();
  return { ...actual, getPayload: vi.fn(async () => payload) };
});
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('../agents/tools/persist', () => ({
  persistSlides: state.persistSlides,
}));
vi.mock('../agents/fonts', () => ({ chooseFontPairForBrief: vi.fn() }));
vi.mock('../lib/sources/mcpConnector', async () => {
  const { SourceConnectorError } = await import('../lib/sources/types');
  return {
    openSourceToolsets: vi.fn(async (sources: Array<{ id: string; failureMode: string }>) => {
      state.openedSourceIds.push(...sources.map((source) => source.id));
      if (
        state.sourceFailures.length > 0 &&
        sources.some((source) => source.failureMode === 'strict')
      ) {
        throw new SourceConnectorError('Strict source unavailable', state.sourceFailures as never);
      }
      return {
        toolsets: Object.fromEntries(sources.map((source) => [source.id, { search: {} }])),
        failures: state.sourceFailures,
        recorder: { snapshot: () => state.evidence },
        disconnect: vi.fn(),
      };
    }),
  };
});
vi.mock('../agents/model', () => ({
  researchWithSources: vi.fn(async ({ name }: { name: string }) => {
    state.modelCalls.push(name);
    return 'Grounded research notes';
  }),
  generateStructured: vi.fn(async ({ name }: { name: string }) => {
    state.modelCalls.push(name);
    if (name === 'gather') {
      return {
        coreIdea: 'Grounded decision',
        audience: 'Executives',
        soWhat: 'The decision affects risk',
        keyPoints: ['Grounded decision'],
        data: ['Fact'],
        sources: ['docs'],
      };
    }
    if (name === 'structure') {
      return {
        slides: [
          {
            blockType: 'cover',
            title: 'Grounded decision',
            intent: 'Grounded decision',
          },
          {
            blockType: 'statement',
            title: 'Grounded decision',
            intent: 'Grounded decision',
          },
          { blockType: 'cta', title: 'Act', intent: 'Grounded decision' },
        ],
      };
    }
    if (name === 'rubricScorer') return { score: 1, flags: [], fix: '' };
    if (name.startsWith('writer:')) {
      const blockType = name.slice('writer:'.length);
      return {
        blockType,
        title: blockType === 'cta' ? 'Act' : 'Grounded decision',
      };
    }
    throw new Error(`Unexpected model call ${name}`);
  }),
}));
vi.mock('../agents/mastra', async () => {
  const { deckWorkflow } = await import('../agents/workflow');
  return {
    mastra: {
      getWorkflow: () => ({
        ...deckWorkflow,
        getWorkflowRunById: vi.fn(async () => ({})),
        createRun: async (...args: Parameters<typeof deckWorkflow.createRun>) => {
          const runId = args[0]!.runId!;
          const existing = state.workflowRuns.get(runId);
          if (existing) return existing;
          const raw = await deckWorkflow.createRun(...args);
          let storedInput: Record<string, unknown> | undefined;
          const run = {
            ...raw,
            stream: (options: Parameters<typeof raw.stream>[0]) => {
              storedInput = options.inputData as Record<string, unknown>;
              return raw.stream(options);
            },
            restart: ({ requestContext, tracingOptions }: any) =>
              raw.stream({
                inputData: storedInput as never,
                requestContext,
                tracingOptions,
              }).result,
          };
          state.workflowRuns.set(runId, run);
          return run;
        },
      }),
    },
  };
});

import { POST } from '../app/(payload)/api/agent-draft/route';
import { POST as POST_RUN_ACTION } from '../app/(payload)/api/agent-draft/[runId]/route';
import { AgentRuns } from '../collections/AgentRuns';
import { runAgentDraftTask } from '../jobs/agentDraft';
import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '../lib/sources/registry';

const evidence = {
  id: 'ev_000000000000000000000000',
  sourceId: 'docs',
  sourceLabel: 'Docs',
  claim: 'Fact',
  excerpt: 'Fact',
  toolName: 'search',
  toolCallId: 'call-1',
  retrievedAt: '2026-09-02T10:00:00.000Z',
  contentSha256: '0'.repeat(64),
};

async function queueExclusiveRun(approvalRequired = false) {
  return POST(
    new Request('http://local/api/agent-draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        presentationId: 1,
        brief: 'A sufficiently detailed exclusive-source brief',
        visual: false,
        approvalRequired,
        sourcePolicy: { mode: 'exclusive', sourceIds: ['docs'] },
      }),
    }) as never,
  );
}

describe('exclusive source admin-to-worker acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ledger = undefined;
    state.queuedInput = undefined;
    state.openedSourceIds = [];
    state.evidence = [evidence];
    state.sourceFailures = [];
    state.modelCalls = [];
    state.workflowRuns.clear();
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
        failureMode: 'strict',
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

  it('runs admin API -> queued task -> real workflow/research with exclusive tool isolation', async () => {
    const response = await queueExclusiveRun();

    expect(response?.status).toBe(202);
    expect(state.ledger).toMatchObject({
      sourcePolicy: 'exclusive',
      sourceIds: ['docs'],
    });
    expect(state.queuedInput).toEqual({ agentRunId: '7', presentationId: '1' });

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.openedSourceIds).toEqual(['docs']);
    expect(state.openedSourceIds).not.toContain('other');
    expect(state.modelCalls).toContain('gather:research');
    expect(state.ledger).toMatchObject({
      status: 'succeeded',
      sourceFailures: [],
    });
    expect(state.presentation).toMatchObject({
      draftStatus: 'done',
      draftSources: ['docs'],
    });
  });

  it('fails the real workflow when the exclusive source captures zero evidence', async () => {
    state.evidence = [];
    await queueExclusiveRun();

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.ledger).toMatchObject({
      status: 'failed',
      errorCode: 'agent-run-failed',
    });
    expect(state.presentation.draftStatus).toBe('failed');
    expect(state.persistSlides).not.toHaveBeenCalled();
  });

  it('fails before model invocation and journals structured exclusive discovery failure', async () => {
    const failure = {
      sourceId: 'docs',
      stage: 'discover',
      code: 'unavailable',
      message: 'connection refused',
    };
    state.sourceFailures = [failure];
    await queueExclusiveRun();

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.modelCalls).toEqual([]);
    expect(state.ledger).toMatchObject({
      status: 'failed',
      errorCode: 'source-unavailable',
      sourcePolicy: 'exclusive',
      sourceIds: ['docs'],
      sourceFailures: [failure],
    });
    expect(state.presentation.draftEvents.at(-1)?.detail).toMatchObject({
      sourceFailures: [failure],
    });
  });

  it('drives the restart route and command with the stored exclusive source boundary', async () => {
    await queueExclusiveRun();
    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });
    const storedPolicy = {
      sourcePolicy: state.ledger?.sourcePolicy,
      sourceIds: state.ledger?.sourceIds,
    };

    await expect(
      payload.update({
        collection: 'agent-runs',
        data: { sourcePolicy: 'multiple', sourceIds: ['docs', 'other'] },
      }),
    ).rejects.toMatchObject({ status: 400 });

    state.ledger = {
      ...state.ledger,
      status: 'stale',
      heartbeatAt: '2026-09-01T00:00:00.000Z',
      ...storedPolicy,
    };
    state.openedSourceIds = [];
    state.queuedInput = undefined;

    const response = await POST_RUN_ACTION(
      new Request(`http://local/api/agent-draft/${state.ledger.mastraRunId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      }) as never,
      { params: Promise.resolve({ runId: state.ledger.mastraRunId }) },
    );

    expect(response?.status).toBe(202);
    expect(state.ledger).toMatchObject({ command: 'restart', ...storedPolicy });
    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });
    expect(state.ledger).toMatchObject({
      status: 'succeeded',
      ...storedPolicy,
    });
    expect(state.openedSourceIds).not.toContain('other');
    expect(state.presentation.draftSources).toEqual(['docs']);
  });
});
