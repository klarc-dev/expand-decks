import { describe, expect, it } from 'vitest';
import { runEvals } from '@mastra/core/evals';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { deckGate } from '../evals/scorers';

const schema = z.object({ brief: z.string() });
const deck = { slides: [{}, {}, {}], markdown: '# deck', evidence: [] };
const workflow = createWorkflow({ id: 'eval-fixture', inputSchema: schema, outputSchema: z.any() })
  .then(
    createStep({
      id: 'make-deck',
      inputSchema: schema,
      outputSchema: z.any(),
      execute: async () => deck,
    }),
  )
  .commit();

describe('workflow evaluation gate', () => {
  it('passes a valid workflow result', async () => {
    // Installed Mastra's public generic overload does not infer locally-created
    // workflow schemas through Vitest's transformed module boundary.
    const result = await (runEvals as (config: unknown) => Promise<{ verdict?: string }>)({
      data: [{ input: { brief: 'test' } }],
      target: workflow,
      scorers: [deckGate],
      gates: [deckGate],
    });
    expect(result.verdict).toBe('passed');
  });
});
