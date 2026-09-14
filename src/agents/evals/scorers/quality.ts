import { createScorer } from '@mastra/core/evals';
import { z } from 'zod';

import { generateStructured } from '../../model';
import { RUBRIC_PROMPT } from '../../prompts/rubric';

const DeckQualityVerdict = z.object({
  score: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),
  progression: z.number().min(0).max(1),
  nonRedundancy: z.number().min(0).max(1),
  actionableConclusion: z.number().min(0).max(1),
  reason: z.string(),
});

export const deckQualityScorer = createScorer({
  id: 'deck-quality',
  name: 'Whole-deck expert quality',
  description: 'Judges coverage, progression, non-redundancy, and conclusion quality.',
})
  .analyze(async ({ run }) => ({
    verdict: await generateStructured({
      name: 'eval:deck-quality',
      instructions: `Judge the WHOLE deck, not isolated slides.

${RUBRIC_PROMPT}

The final score must reflect complete requested-concept coverage, coherent progression, non-redundancy, an actionable conclusion, requested language, and audience level.

Apply the same evidence boundary as the grounding scorer when judging fidelity: established general knowledge and clearly labeled generic examples needed to explain the requested subject are not scope drift merely because the allowed-facts list is non-exhaustive. Penalize only additions that introduce a real entity, false precision, disputed causal claim, guarantee, precise external authority, or personalized recommendation not supported by the request. Judge whether examples teach the requested distinction, not whether every generic premise appears verbatim in the brief.

Derive the final score from the four numeric dimensions rather than applying an extra hidden grounding penalty already covered by the separate deck-grounding scorer. Use their arithmetic mean as the default; depart materially only when the requested language, audience level, required format, or a hard requirement fails. Do not score below that dimensional mean because of stylistic observations that are already reflected in progression or non-redundancy.`,
      schema: DeckQualityVerdict,
      prompt: `REQUEST AND EXPECTATIONS:\n${JSON.stringify(
        { input: run.input, groundTruth: run.groundTruth },
        null,
        2,
      )}\n\nGENERATED DECK:\n${JSON.stringify(run.output, null, 2)}`,
      modelTier: 'judge',
    }),
  }))
  .generateScore(({ results }) => results.analyzeStepResult.verdict.score)
  .generateReason(({ results }) => results.analyzeStepResult.verdict.reason);

const GroundingVerdict = z.object({
  supportedRatio: z.number().min(0).max(1),
  unsupportedClaims: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  reason: z.string(),
});

export const deckGroundingScorer = createScorer({
  id: 'deck-grounding',
  name: 'Deck grounding',
  description: 'Checks claims against allowed facts and forbidden claims.',
})
  .analyze(async ({ run }) => ({
    verdict: await generateStructured({
      name: 'eval:deck-grounding',
      instructions: `You are an evidence auditor. First infer the task type from the request. When the author asks to explain, teach, or synthesize a topic, established general knowledge needed to answer that topic is supported even when the allowed-facts list is not exhaustive. The brief and allowed facts remain the only authority for claims specific to the author, organization, clients, or a real case, and for numbers, dates, quotations, attributions, studies, current events, precise sources, disputed causal claims, guarantees, and personalized recommendations. Clearly labeled generic examples are supported when they introduce no real entity, external authority, invented result, or false precision. Penalize statements about missing or unconfirmed author-specific information when the request is explanatory rather than an audit.`,
      schema: GroundingVerdict,
      prompt: `GROUND TRUTH:\n${JSON.stringify(run.groundTruth, null, 2)}\n\nGENERATED DECK:\n${JSON.stringify(run.output, null, 2)}`,
      modelTier: 'judge',
    }),
  }))
  .generateScore(({ results }) => results.analyzeStepResult.verdict.supportedRatio)
  .generateReason(({ results }) => results.analyzeStepResult.verdict.reason);
