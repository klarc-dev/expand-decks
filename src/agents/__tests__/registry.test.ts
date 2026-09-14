import { describe, expect, it, vi } from 'vitest';

const { modelForTierMock } = vi.hoisted(() => ({ modelForTierMock: vi.fn((tier) => tier) }));

vi.mock('../../lib/ai', () => ({
  modelForTier: modelForTierMock,
  cloudCLIProxy: vi.fn((model) => model),
}));

import { mastra } from '../mastra';
import {
  instructionsForAgent,
  gatherAgent,
  researchAgent,
  resolveDeckAgentModel,
  revisionAgent,
  rubricAgent,
  structureAgent,
  typographyAgent,
  visualAgent,
  writerAgent,
} from '../registry';
import { withDeckLanguage } from '../requestContext';

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
    expect(resolveDeckAgentModel('research')).toBe('research');
    expect(modelForTierMock).toHaveBeenCalledWith('research');
  });

  it('honors a per-run model before the phase tier', () => {
    expect(resolveDeckAgentModel('research', { get: () => 'custom-model' })).toBe('custom-model');
  });

  it('localizes content-producing roles from the request context and leaves judges alone', async () => {
    const en = withDeckLanguage(undefined, 'en');
    const fr = withDeckLanguage(undefined, 'fr');

    for (const agent of [gatherAgent, researchAgent, structureAgent, writerAgent, revisionAgent]) {
      expect(String(await agent.getInstructions({ requestContext: en }))).toContain(
        'Required output language: English',
      );
      expect(String(await agent.getInstructions({ requestContext: fr }))).toContain(
        'Langue de sortie imposée : français',
      );
      expect(String(await agent.getInstructions())).not.toContain('Required output language');
    }
    for (const agent of [rubricAgent, visualAgent, typographyAgent]) {
      expect(String(await agent.getInstructions({ requestContext: en }))).not.toContain(
        'Required output language',
      );
    }

    // The per-call override rebuilds the same prefix ahead of the phase prompt.
    const invocation = instructionsForAgent(writerAgent, 'Phase prompt', en);
    expect(invocation.indexOf('Tu es le rédacteur')).toBe(0);
    expect(invocation.indexOf('Required output language: English')).toBeLessThan(
      invocation.indexOf('Phase prompt'),
    );
  });

  it('makes the final-output contract part of every role', async () => {
    for (const agent of Object.values(mastra.listAgents())) {
      const instructions = await agent.getInstructions();
      expect(String(instructions)).toContain('Produis directement le résultat final demandé');
      expect(String(instructions)).toContain('Ne décris jamais le travail à effectuer');
    }
  });
});
