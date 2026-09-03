import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ledger: undefined as Record<string, any> | undefined,
  presentation: {} as Record<string, any>,
  queuedInput: undefined as Record<string, unknown> | undefined,
  openedSourceIds: [] as string[],
  evidence: [] as Record<string, unknown>[],
  evidenceByOpen: [] as Record<string, unknown>[][],
  forceStructureResearch: false,
  structureCalls: 0,
  sourceFailures: [] as Record<string, unknown>[],
  knowledgeHits: [] as Record<string, unknown>[],
  knowledgeQuery: vi.fn(),
  modelCalls: [] as string[],
  persistSlides: vi.fn(),
  workflowRuns: new Map<string, any>(),
}));

const payload = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: { id: 2, role: 'admin' } })),
  find: vi.fn(async ({ collection }: { collection?: string }) => ({
    docs:
      collection === 'agent-runs' && state.ledger
        ? [state.ledger]
        : collection === 'knowledge-bases'
          ? [{ id: 42, name: 'Contrats' }]
          : [],
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
vi.mock('../lib/sources/mcpConnector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/sources/mcpConnector')>();
  const { SourceConnectorError } = await import('../lib/sources/types');
  return {
    ...actual,
    openSourceToolsets: vi.fn(
      async (sources: Array<{ id: string; failureMode: string; transport: string }>) => {
        state.openedSourceIds.push(...sources.map((source) => source.id));
        if (sources.every((source) => source.transport === 'knowledge')) {
          return actual.openSourceToolsets(sources as never, {
            vectorStore: { query: state.knowledgeQuery },
            embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
          });
        }
        if (
          state.sourceFailures.length > 0 &&
          sources.some((source) => source.failureMode === 'strict')
        ) {
          throw new SourceConnectorError(
            'Strict source unavailable',
            state.sourceFailures as never,
          );
        }
        const capturedEvidence = state.evidenceByOpen.shift() ?? state.evidence;
        return {
          toolsets: Object.fromEntries(sources.map((source) => [source.id, { search: {} }])),
          failures: state.sourceFailures,
          recorder: { snapshot: () => capturedEvidence },
          disconnect: vi.fn(),
        };
      },
    ),
  };
});
vi.mock('../agents/model', () => ({
  researchWithSources: vi.fn(
    async ({
      name,
      toolsets,
    }: {
      name: string;
      toolsets?: Record<string, Record<string, { execute?: Function }>>;
    }) => {
      state.modelCalls.push(name);
      const knowledgeSearch = toolsets?.knowledge_42?.search;
      if (knowledgeSearch?.execute) {
        await knowledgeSearch.execute(
          { query: 'clause résolutoire', topK: 5 },
          { toolCallId: `${name}-kb` },
        );
      }
      return 'Grounded research notes';
    },
  ),
  generateStructured: vi.fn(async ({ name }: { name: string }) => {
    state.modelCalls.push(name);
    if (name === 'gather') {
      return {
        coreIdea: 'Grounded decision',
        audience: 'Executives',
        soWhat: 'The decision affects risk',
        keyPoints: ['Grounded decision'],
        data: ['Fact'],
        sources: state.openedSourceIds.filter((id) => id.startsWith('knowledge_')).length
          ? ['knowledge_42']
          : ['docs'],
      };
    }
    if (name === 'structure') {
      state.structureCalls += 1;
      if (state.forceStructureResearch && state.structureCalls === 1) {
        return {
          slides: [
            { blockType: 'cover', title: 'Unrelated', intent: 'Unrelated' },
            { blockType: 'cta', title: 'Act', intent: 'Act' },
          ],
        };
      }
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
    if (name === 'gather:grounding-audit') {
      return { supported: true, unsupportedClaims: [], reason: 'All claims are grounded.' };
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

const structureEvidence = {
  ...evidence,
  id: 'ev_111111111111111111111111',
  claim: 'Structure fact',
  excerpt: 'Structure fact',
  toolCallId: 'call-2',
  contentSha256: '1'.repeat(64),
};

const knowledgeEvidence = {
  ...evidence,
  id: 'ev_222222222222222222222222',
  sourceId: 'knowledge_42',
  sourceLabel: 'Contrats',
  excerpt: 'Clause résolutoire verbatim.',
  claim: 'Clause résolutoire verbatim.',
  documentId: '9',
  documentTitle: 'Contrat cadre',
  chunkIndex: 3,
  contentSha256: '2'.repeat(64),
};

async function queueRun(
  sourcePolicy: { mode: 'exclusive' | 'multiple'; sourceIds: string[] },
  approvalRequired = false,
) {
  return POST(
    new Request('http://local/api/agent-draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        presentationId: 1,
        brief: 'A sufficiently detailed exclusive-source brief',
        visual: false,
        approvalRequired,
        sourcePolicy,
      }),
    }) as never,
  );
}

async function queueExclusiveRun(approvalRequired = false) {
  return queueRun({ mode: 'exclusive', sourceIds: ['docs'] }, approvalRequired);
}

describe('exclusive source admin-to-worker acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ledger = undefined;
    state.queuedInput = undefined;
    state.openedSourceIds = [];
    state.evidence = [evidence];
    state.evidenceByOpen = [];
    state.forceStructureResearch = false;
    state.structureCalls = 0;
    state.sourceFailures = [];
    state.knowledgeHits = [];
    state.knowledgeQuery.mockReset().mockImplementation(async () => state.knowledgeHits);
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

  it('persists provenance captured during structure research alongside gather evidence', async () => {
    state.forceStructureResearch = true;
    state.evidenceByOpen = [[evidence], [structureEvidence]];
    await queueExclusiveRun();

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.modelCalls).toContain('structure:research');
    expect(state.ledger).toMatchObject({
      status: 'succeeded',
      evidence: [evidence, structureEvidence],
    });
    expect(state.presentation).toMatchObject({
      draftSources: ['docs'],
      draftEvidence: [evidence, structureEvidence],
    });
  });

  it('runs exclusive knowledge search through the real connector and persists verbatim provenance', async () => {
    state.knowledgeHits = [
      {
        id: 'chunk-9',
        score: 0.91,
        metadata: {
          knowledgeBaseId: '42',
          documentId: '9',
          title: 'Contrat cadre',
          chunkIndex: 3,
          text: 'Clause résolutoire verbatim.',
        },
      },
    ];
    await queueRun({ mode: 'exclusive', sourceIds: ['knowledge_42'] });
    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.knowledgeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: 'knowledge_42',
        filter: { knowledgeBaseId: '42' },
        minScore: 0.35,
      }),
    );
    expect(state.presentation).toMatchObject({
      draftStatus: 'done',
      draftSources: ['knowledge_42'],
      draftEvidence: [
        expect.objectContaining({
          sourceId: 'knowledge_42',
          excerpt: 'Clause résolutoire verbatim.',
          documentId: '9',
          documentTitle: 'Contrat cadre',
          chunkIndex: 3,
        }),
      ],
    });
  });

  it('fails exclusive knowledge mode when vector search returns zero excerpts', async () => {
    await queueRun({ mode: 'exclusive', sourceIds: ['knowledge_42'] });
    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.knowledgeQuery).toHaveBeenCalled();
    expect(state.ledger).toMatchObject({
      status: 'failed',
      errorCode: 'source-unavailable',
      sourceFailures: [
        expect.objectContaining({
          sourceId: 'knowledge_42',
          stage: 'tool',
          code: 'invalid-result',
        }),
      ],
    });
    expect(state.presentation.draftStatus).toBe('failed');
    expect(state.persistSlides).not.toHaveBeenCalled();
  });

  it('persists mixed MCP and knowledge-base evidence with document provenance', async () => {
    state.evidence = [evidence, knowledgeEvidence];
    await queueRun({ mode: 'multiple', sourceIds: ['docs', 'knowledge_42'] });

    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.openedSourceIds).toEqual(['docs', 'knowledge_42']);
    expect(state.ledger).toMatchObject({
      status: 'succeeded',
      sourceIds: ['docs', 'knowledge_42'],
      evidence: [evidence, knowledgeEvidence],
    });
    expect(state.presentation).toMatchObject({
      draftSources: ['docs', 'knowledge_42'],
      draftEvidence: [evidence, knowledgeEvidence],
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
      errorCode: 'source-unavailable',
      sourceFailures: [
        expect.objectContaining({
          sourceId: 'docs',
          stage: 'tool',
          code: 'invalid-result',
        }),
      ],
    });
    expect(state.presentation.draftStatus).toBe('failed');
    expect(state.persistSlides).not.toHaveBeenCalled();
  });

  it('surfaces exclusive MCP tool execution failures as source-unavailable', async () => {
    const failure = {
      sourceId: 'docs',
      stage: 'tool',
      code: 'timeout',
      message: 'tool timed out',
    };
    const { SourceConnectorError } = await import('../lib/sources/types');
    const { researchWithSources } = await import('../agents/model');
    vi.mocked(researchWithSources).mockRejectedValueOnce(
      new SourceConnectorError('Tool execution failed', [failure] as never),
    );
    await queueExclusiveRun();

    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.ledger).toMatchObject({
      status: 'failed',
      errorCode: 'source-unavailable',
      sourceFailures: [failure],
    });
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

  it('persists best-effort exclusive discovery failures through workflow consumption', async () => {
    const failure = {
      sourceId: 'docs',
      stage: 'discover',
      code: 'unavailable',
      message: 'connection refused',
    };
    state.sourceFailures = [failure];
    process.env[SOURCE_REGISTRY_ENV] = JSON.stringify([
      {
        id: 'docs',
        label: 'Docs',
        transport: 'http',
        url: 'https://example.com/mcp',
        allowedTools: ['search'],
        failureMode: 'best-effort',
      },
    ]);
    __resetSourceRegistryForTests();
    await queueExclusiveRun();

    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.modelCalls).toEqual([]);
    expect(state.ledger).toMatchObject({
      status: 'failed',
      errorCode: 'source-unavailable',
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
