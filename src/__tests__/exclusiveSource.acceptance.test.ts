import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ledger: undefined as Record<string, any> | undefined,
  presentation: {} as Record<string, any>,
  queuedInput: undefined as Record<string, unknown> | undefined,
  openedSourceIds: [] as string[],
  forceStructureResearch: false,
  structureCalls: 0,
  targetSlideCount: 0,
  structurePrompt: '',
  structureSchema: undefined as { safeParse: Function } | undefined,
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
          ? [{ id: 42, name: 'Contrats', readiness: 'ready' }]
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
    cancelByID: vi.fn(),
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
vi.mock('../lib/sources/knowledgeConnector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/sources/knowledgeConnector')>();
  return {
    ...actual,
    openSourceToolsets: vi.fn(async (sources: Array<{ id: string }>) => {
      state.openedSourceIds.push(...sources.map((source) => source.id));
      return actual.openSourceToolsets(sources as never, {
        vectorStore: { query: state.knowledgeQuery },
        embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
      });
    }),
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
  generateStructured: vi.fn(
    async ({
      name,
      prompt,
      schema,
    }: {
      name: string;
      prompt: string;
      schema: { safeParse: Function };
    }) => {
      state.modelCalls.push(name);
      if (name === 'gather') {
        return {
          coreIdea: 'Grounded decision',
          audience: 'Executives',
          soWhat: 'The decision affects risk',
          keyPoints: ['Grounded decision'],
          data: ['Fact'],
          sources: ['knowledge_42'],
        };
      }
      if (name === 'structure') {
        state.structurePrompt = prompt;
        state.structureSchema = schema;
        state.structureCalls += 1;
        if (state.targetSlideCount)
          return {
            slides: Array.from({ length: state.targetSlideCount }, () => ({
              blockType: 'statement',
              title: 'Grounded decision',
              intent: 'Grounded decision',
            })),
          };
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
    },
  ),
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
import { KNOWLEDGE_MIN_SCORE } from '../lib/sources/knowledgeRetrieval';

async function queueRun(
  sourcePolicy: { mode: 'exclusive' | 'multiple'; sourceIds: string[] },
  approvalRequired = false,
  slideCountRange?: { min: number; max: number },
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
        slideCountRange,
        sourcePolicy,
      }),
    }) as never,
  );
}

async function queueExclusiveRun(approvalRequired = false) {
  return queueRun({ mode: 'exclusive', sourceIds: ['knowledge_42'] }, approvalRequired);
}

describe('exclusive source admin-to-worker acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ledger = undefined;
    state.queuedInput = undefined;
    state.openedSourceIds = [];
    state.forceStructureResearch = false;
    state.structureCalls = 0;
    state.targetSlideCount = 0;
    state.structurePrompt = '';
    state.structureSchema = undefined;
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
  });

  it('runs admin API -> queued task -> real workflow/research with exclusive knowledge isolation', async () => {
    const response = await queueExclusiveRun();

    expect(response?.status).toBe(202);
    expect(state.ledger).toMatchObject({
      sourcePolicy: 'exclusive',
      sourceIds: ['knowledge_42'],
    });
    expect(state.queuedInput).toEqual({ agentRunId: '7', presentationId: '1' });

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.openedSourceIds).toEqual(['knowledge_42']);
    expect(state.modelCalls).toContain('gather:research');
    expect(state.ledger).toMatchObject({ status: 'succeeded' });
    expect(state.presentation.draftStatus).toBe('done');
    expect(state.ledger).toMatchObject({ sourceIds: ['knowledge_42'] });
  });

  it('carries a 20–25 slide target from the API through the real workflow to persistence', async () => {
    state.targetSlideCount = 22;
    const response = await queueRun({ mode: 'exclusive', sourceIds: ['knowledge_42'] }, false, {
      min: 20,
      max: 25,
    });
    expect(response.status).toBe(202);
    expect(state.ledger?.slideCountRange).toEqual({ min: 20, max: 25 });
    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });
    expect(state.ledger?.status).toBe('succeeded');
    expect(state.structurePrompt).toContain('entre 20 et 25 diapositives');
    const stubs = (count: number) => ({
      slides: Array.from({ length: count }, () => ({
        blockType: 'statement',
        title: 'Grounded decision',
        intent: 'Grounded decision',
      })),
    });
    expect(state.structureSchema?.safeParse(stubs(15)).success).toBe(false);
    expect(state.structureSchema?.safeParse(stubs(22)).success).toBe(true);
    expect(state.persistSlides.mock.calls[0]![0].slides).toHaveLength(22);
  });

  it('persists provenance captured during structure research alongside gather evidence', async () => {
    state.forceStructureResearch = true;
    await queueExclusiveRun();

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.modelCalls).toContain('structure:research');
    expect(state.ledger).toMatchObject({ status: 'succeeded' });
    expect(state.presentation.draftStatus).toBe('done');
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
        minScore: KNOWLEDGE_MIN_SCORE,
      }),
    );
    expect(state.presentation.draftStatus).toBe('done');
    expect(state.ledger).toMatchObject({ sourceIds: ['knowledge_42'], status: 'succeeded' });
  });

  it('fails exclusive knowledge mode when vector search returns zero excerpts', async () => {
    state.knowledgeHits = [];
    await queueRun({ mode: 'exclusive', sourceIds: ['knowledge_42'] });
    await runAgentDraftTask({ input: state.queuedInput, req: { payload } as never });

    expect(state.knowledgeQuery).toHaveBeenCalled();
    expect(state.ledger).toMatchObject({ status: 'failed' });
    expect(state.ledger?.events.at(-1)?.detail).toMatchObject({
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

  it('fails the real workflow when the exclusive source captures zero evidence', async () => {
    state.knowledgeHits = [];
    await queueExclusiveRun();

    await runAgentDraftTask({
      input: state.queuedInput,
      req: { payload } as never,
    });

    expect(state.ledger).toMatchObject({ status: 'failed' });
    expect(state.ledger?.events.at(-1)?.detail).toMatchObject({
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
        data: { sourcePolicy: 'multiple', sourceIds: ['knowledge_42', 'knowledge_43'] },
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
    expect(state.ledger?.sourceIds).toEqual(['knowledge_42']);
  });
});
