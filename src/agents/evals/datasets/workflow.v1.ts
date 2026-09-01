import type { z } from 'zod';

import type { WorkflowFixtureSchema } from '../config';

export const workflowDatasetV1 = [
  {
    externalId: 'bluf-en-001',
    input: {
      brief:
        'Create a 5–6 slide expert training deck for corporate lawyers explaining why leading with the conclusion improves an executive legal presentation. Cover working-memory limits, one before/after example, the strongest objection, and a practical checklist.',
      language: 'en',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 8,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [
        ['conclusion', 'verdict', 'bluf'],
        ['working memory', 'cognitive load'],
        ['objection', 'limitation'],
        ['checklist', 'practice', 'apply'],
      ],
      allowedFacts: [],
      forbiddenClaims: ['guarantees success', '100%'],
    },
  },
  {
    externalId: 'decision-fr-001',
    input: {
      brief:
        "Deck expert de 5 à 7 diapositives pour dirigeants d'ETI : distinguer une décision réversible d'une décision irréversible, montrer les critères de qualification, un cas limite et une matrice d'action.",
      language: 'fr',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 9,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [
        ['réversible', 'irréversible'],
        ['critère', 'qualification'],
        ['cas limite', 'exception'],
        ['matrice', 'action'],
      ],
      allowedFacts: [],
      forbiddenClaims: ['toujours', 'garantit'],
    },
  },
  {
    externalId: 'explicit-en-001',
    input: {
      brief: `S1 — Decision quality
Executive training

S2 — Reversible decisions preserve options
Explain low-cost correction.

S3 — Irreversible decisions require evidence
Compare commitment and downside.

S4 — Apply the test
Give a three-question checklist.

S5 — Decide deliberately
CTA: classify the next decision.`,
      language: 'en',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 5,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [['reversible'], ['irreversible'], ['checklist', 'three-question']],
      allowedFacts: [],
      forbiddenClaims: [],
    },
  },
] satisfies Array<z.input<typeof WorkflowFixtureSchema>>;
