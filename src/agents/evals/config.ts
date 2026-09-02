import { z } from 'zod';

export const DATASET_IDS = {
  workflow: 'deck-workflow-v1',
  grounding: 'deck-grounding-v1',
  rubric: 'rubric-calibration-v1',
  visual: 'visual-quality-v1',
  revision: 'deck-revision-v1',
} as const;

export const EVAL_THRESHOLDS = {
  workflowContract: 1,
  deckQuality: 0.75,
  grounding: 0.85,
  rubricCalibrationAccuracy: 0.9,
  rubricPairMargin: 0.2,
  visualClean: 0.7,
  visualBrokenMax: 0.5,
  revisionRequestedChange: 0.8,
  revisionPreservation: 0.85,
} as const;

export const DeckEvalInputSchema = z.object({
  brief: z.string().min(1),
  language: z.enum(['fr', 'en']),
  title: z.string().min(1).optional(),
  sourceIds: z.array(z.string()).default([]),
  visual: z.boolean().default(false),
  approvalRequired: z.boolean().default(false),
  groundingFacts: z.array(z.string()).optional(),
});

export const DeckGroundTruthSchema = z.object({
  minSlides: z.number().int().min(3),
  maxSlides: z.number().int().max(40),
  requiredBlockTypes: z.array(z.string()),
  requiredConcepts: z.array(z.array(z.string().min(1)).min(1)),
  allowedFacts: z.array(z.string()).default([]),
  forbiddenClaims: z.array(z.string()).default([]),
});

export const WorkflowFixtureSchema = z.object({
  externalId: z.string().min(1),
  input: DeckEvalInputSchema,
  groundTruth: DeckGroundTruthSchema,
});

export const RevisionFixtureSchema = z.object({
  externalId: z.string().min(1),
  initial: DeckEvalInputSchema,
  turns: z.array(z.object({ instruction: z.string().min(1) })).min(1),
  groundTruth: z.object({
    requiredAfterRevision: z.array(z.array(z.string().min(1)).min(1)),
    mustPreserve: z.array(z.array(z.string().min(1)).min(1)),
    forbiddenAfterRevision: z.array(z.string()).default([]),
  }),
});

export type DeckGroundTruth = z.infer<typeof DeckGroundTruthSchema>;
