import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const start = vi.fn(async () => ({ status: 'success', result: { slides: [] } }));
  const createRun = vi.fn(async () => ({ start }));
  const getWorkflow = vi.fn(() => ({ createRun }));
  return { start, createRun, getWorkflow };
});

vi.mock('../mastra', () => ({ mastra: { getWorkflow: mocks.getWorkflow } }));

import { runDeckFromBrief } from '../runFromBrief';

describe('runDeckFromBrief workflow input', () => {
  it('passes visual as immutable workflow input instead of unused initial state', async () => {
    await runDeckFromBrief('A sufficiently detailed English presentation brief.', {
      language: 'en',
      visual: true,
    });

    expect(mocks.start).toHaveBeenCalledWith({
      inputData: {
        brief: 'A sufficiently detailed English presentation brief.',
        language: 'en',
        sourceIds: [],
        visual: true,
        approvalRequired: false,
      },
    });
  });
});
