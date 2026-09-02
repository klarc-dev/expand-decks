import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const start = vi.fn(async () => ({ status: 'success', result: { slides: [] } }));
  const createRun = vi.fn(async () => ({ start }));
  const getWorkflow = vi.fn(() => ({ createRun }));
  return { start, createRun, getWorkflow };
});

vi.mock('../mastra', () => ({ mastra: { getWorkflow: mocks.getWorkflow } }));

import { runDeckFromBrief } from '../runFromBrief';

describe('runDeckFromBrief workflow input', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes visual and the no-source policy as immutable workflow input', async () => {
    await runDeckFromBrief('A sufficiently detailed English presentation brief.', {
      language: 'en',
      visual: true,
    });

    expect(mocks.start).toHaveBeenCalledWith({
      inputData: {
        brief: 'A sufficiently detailed English presentation brief.',
        language: 'en',
        sourcePolicy: { mode: 'none', sourceIds: [] },
        visual: true,
        approvalRequired: false,
      },
    });
  });

  it('preserves legacy non-empty sourceIds by deriving multiple-source policy', async () => {
    await runDeckFromBrief('A sufficiently detailed sourced presentation brief.', {
      sourceIds: ['docs'],
    });

    expect(mocks.start).toHaveBeenCalledWith(
      expect.objectContaining({
        inputData: expect.objectContaining({
          sourcePolicy: { mode: 'multiple', sourceIds: ['docs'] },
        }),
      }),
    );
  });

  it('accepts an explicit exclusive source policy', async () => {
    await runDeckFromBrief('A sufficiently detailed exclusive presentation brief.', {
      sourcePolicy: { mode: 'exclusive', sourceIds: ['docs'] },
    });

    expect(mocks.start).toHaveBeenCalledWith(
      expect.objectContaining({
        inputData: expect.objectContaining({
          sourcePolicy: { mode: 'exclusive', sourceIds: ['docs'] },
        }),
      }),
    );
  });
});
