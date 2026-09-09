import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payload } from 'payload';

const mocks = vi.hoisted(() => ({ stream: vi.fn(), createRun: vi.fn() }));
vi.mock('../../agents/mastra', () => ({
  mastra: { getWorkflow: () => ({ createRun: mocks.createRun }) },
}));
vi.mock('../../agents/fonts', () => ({ chooseFontPairForBrief: vi.fn() }));
vi.mock('../../agents/tools/persist', () => ({ persistSlides: vi.fn() }));
vi.mock('../../lib/deckContext', () => ({
  deckContext: () => 'Deck context\n',
}));
vi.mock('../../lib/currentDeckContext', () => ({
  currentDeckContext: async () => 'Existing slides',
}));
vi.mock('../../agents/requestContext', () => ({
  createDeckRequestContext: vi.fn(),
}));
vi.mock('../../lib/sources/serverContext', () => ({
  configureSourceResolutionPayload: vi.fn(),
}));

import { normalizeWorkflowPhase, runAgentCommand } from '../agentRunCommands';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createRun.mockResolvedValue({ stream: mocks.stream, cancel: vi.fn() });
  mocks.stream.mockReturnValue({
    fullStream: { async *[Symbol.asyncIterator]() {} },
    result: Promise.resolve({ status: 'suspended', suspended: {} }),
  });
});

function fixture(slideCountRange: unknown, mode = 'replace') {
  const ledger = {
    id: 7,
    presentation: 1,
    createdBy: 2,
    mastraRunId: 'run-1',
    requestId: 'req-1',
    traceId: 'trace-1',
    command: 'start',
    mode,
    language: 'fr',
    brief: 'Original sufficiently detailed brief',
    slideCountRange,
    events: [],
  };
  const update = vi.fn(async ({ collection, data }) =>
    collection === 'agent-runs' ? { ...ledger, ...data } : data,
  );
  const payload = {
    findByID: vi.fn(async ({ collection }) =>
      collection === 'agent-runs'
        ? ledger
        : {
            id: 1,
            title: 'Deck',
            draftRunId: 'run-1',
            slides: [],
          },
    ),
    update,
    logger: { error: vi.fn(), warn: vi.fn() },
  };
  return { ledger, payload: payload as unknown as Payload, update };
}

describe('durable slide count range propagation', () => {
  it.each(['replace', 'revise'])(
    'passes the stored validated range into %s workflow input',
    async (mode) => {
      const range = { min: 8, max: 12 };
      const { payload, ledger } = fixture(range, mode);
      expect(await runAgentCommand(payload, 7)).toMatchObject({
        success: true,
        suspended: true,
      });
      const input = mocks.stream.mock.calls[0]![0].inputData;
      expect(input.slideCountRange).toEqual(range);
      expect(input.brief).toContain('SLIDE COUNT TARGET: 8–12 slides');
      expect(input.brief).toContain('takes priority over other slide counts');
      expect(input.brief).toContain('merge or split slides');
      expect(input.brief).toContain(ledger.brief);
      expect(ledger.brief).toBe('Original sufficiently detailed brief');
    },
  );

  it.each([null, undefined])('preserves unconstrained legacy run input for %j', async (range) => {
    const { payload, ledger } = fixture(range);
    await runAgentCommand(payload, 7);
    const input = mocks.stream.mock.calls[0]![0].inputData;
    expect(input).not.toHaveProperty('slideCountRange');
    expect(input.brief).toBe(`Deck context\n${ledger.brief}`);
  });

  it.each([
    { min: 12, max: 8 },
    { min: 2, max: 10 },
    { min: 3, max: 41 },
    { min: 3.5, max: 10 },
  ])('fails closed on malformed stored bounds %j', async (range) => {
    const { payload, update } = fixture(range);
    expect(await runAgentCommand(payload, 7)).toMatchObject({ success: false });
    expect(mocks.createRun).not.toHaveBeenCalled();
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'agent-runs',
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
});

describe('normalizeWorkflowPhase', () => {
  it('ignores Mastra mapping step ids that are not durable agent phases', () => {
    expect(normalizeWorkflowPhase('mapping_deckWorkflow_0')).toBeUndefined();
  });

  it('keeps durable phases and strips sub-phase detail', () => {
    expect(normalizeWorkflowPhase('validate:revise')).toBe('validate');
    expect(normalizeWorkflowPhase('draft')).toBe('draft');
  });
});
