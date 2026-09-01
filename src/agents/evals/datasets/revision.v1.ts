import type { z } from 'zod';

import type { RevisionFixtureSchema } from '../config';

export const revisionDatasetV1 = [
  {
    externalId: 'revision-checklist-en-001',
    initial: {
      brief:
        'Create a five-slide executive training deck about reversible and irreversible decisions, with one example and a final action.',
      language: 'en',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    turns: [
      {
        instruction:
          'Keep every fact and example, but replace the final CTA with a three-question checklist.',
      },
    ],
    groundTruth: {
      requiredAfterRevision: [['three', 'question', 'checklist']],
      mustPreserve: [['reversible'], ['irreversible']],
      forbiddenAfterRevision: [],
    },
  },
  {
    externalId: 'revision-tone-fr-001',
    initial: {
      brief:
        "Deck de cinq diapositives pour dirigeants sur les délais d'approbation, avec deux causes, un arbitrage et une conclusion pratique.",
      language: 'fr',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    turns: [
      {
        instruction:
          'Préserve la structure, les faits et les exemples, mais rends tous les titres moins promotionnels.',
      },
    ],
    groundTruth: {
      requiredAfterRevision: [['titre', 'factuel', 'sobre']],
      mustPreserve: [['approbation'], ['arbitrage']],
      forbiddenAfterRevision: ['révolutionnaire', 'garanti', 'incontournable'],
    },
  },
] satisfies Array<z.input<typeof RevisionFixtureSchema>>;
