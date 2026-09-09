import { describe, expect, it, vi } from 'vitest';

const { modelForTierMock } = vi.hoisted(() => ({ modelForTierMock: vi.fn((tier) => tier) }));

vi.mock('../../lib/ai', () => ({
  modelForTier: modelForTierMock,
  cloudCLIProxy: vi.fn((model) => model),
}));

import { mastra } from '../mastra';
import {
  gatherAgent,
  researchAgent,
  revisionAgent,
  rubricAgent,
  structureAgent,
  typographyAgent,
  visualAgent,
  writerAgent,
} from '../registry';

describe('Mastra deck agent registry', () => {
  it('registers each workflow role as a stable native Mastra agent', () => {
    expect(mastra.listAgents()).toEqual({
      gather: gatherAgent,
      research: researchAgent,
      structure: structureAgent,
      writer: writerAgent,
      revision: revisionAgent,
      rubric: rubricAgent,
      visual: visualAgent,
      typography: typographyAgent,
    });

    expect(mastra.getAgent('gather').id).toBe('deck-gatherer');
    expect(mastra.getAgent('structure').id).toBe('deck-structure-planner');
    expect(mastra.getAgent('writer').id).toBe('deck-slide-writer');
    expect(mastra.getAgent('revision').id).toBe('deck-slide-reviser');
  });

  it('configures research roles with the dedicated research model tier', () => {
    expect(modelForTierMock.mock.calls.filter(([tier]) => tier === 'research')).toHaveLength(2);
  });

  it('makes the final-output contract part of every role', async () => {
    for (const agent of Object.values(mastra.listAgents())) {
      const instructions = await agent.getInstructions();
      expect(String(instructions)).toContain('Produis directement le résultat final demandé');
      expect(String(instructions)).toContain('Ne décris jamais le travail à effectuer');
    }
  });
});
