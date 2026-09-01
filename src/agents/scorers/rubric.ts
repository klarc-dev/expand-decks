/**
 * Rubric scorer — LLM-JUDGE semantic critique as a native Mastra Scorer
 * (`createScorer` from @mastra/core/evals). Judges one slide against
 * RUBRIC_PROMPT (the researched "interesting expert content" rules) and returns
 * a 0..1 score; the reason carries a concrete fix instruction the revise loop
 * feeds back to the writer.
 *
 * documents-plugin "validation split": semantic judgement lives in a prompt.
 * Mastra-native: the judgement goes through the same CloudCLIProxy route via
 * generateStructured (forced `emit` tool). Structural overflow is NOT scored
 * here — it is PREVENTED at the SSOT (per-layout `.max()` array bounds), so the
 * gateway's tool-calling constrains generation and a slide cannot overflow.
 */
import { createScorer } from '@mastra/core/evals';
import { z } from 'zod';

import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';

const RubricVerdict = z.object({
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('0..1 — how well the slide meets the expert-content rules (1 = excellent)'),
  flags: z
    .array(
      z.enum([
        'multiple_ideas',
        'topic_headline',
        'vague',
        'no_relevance',
        'one_sided',
        'overclaim',
      ]),
    )
    .describe('Which rules the slide breaks (empty if none)'),
  fix: z.string().describe('One imperative instruction to fix the worst issue (empty if none)'),
});

const JUDGE_INSTRUCTIONS = `Tu es le juge qualité d'une diapositive de formation de niveau expert. Tu notes UNE diapositive selon les règles ci-dessous et tu renvoies un score 0..1, les règles enfreintes, et UNE instruction de correction.

${RUBRIC_PROMPT}

Barème :
- 1.0 : une seule fonction pédagogique, titre-message, concret, exact, charge maîtrisée.
- 0.7 : correct mais perfectible (un point faible).
- < 0.5 : enfreint une règle structurante (titre-thème, fonctions multiples, invention, survente, vague).
Sois exigeant mais juste. fix = action concrète et brève (ex. "Réécris le titre comme le message à retenir").`;

async function judge(
  slide: unknown,
  abortSignal?: AbortSignal,
): Promise<z.infer<typeof RubricVerdict>> {
  return generateStructured({
    name: 'rubricScorer',
    instructions: JUDGE_INSTRUCTIONS,
    schema: RubricVerdict,
    prompt: `Diapositive (JSON) :\n${JSON.stringify(slide, null, 2)}`,
    modelTier: 'judge',
    abortSignal,
  });
}

/**
 * Native Mastra Scorer. Input shape: `{ slide }`. The analyze step runs the
 * LLM-judge; generateScore returns the numeric score; generateReason surfaces
 * the fix instruction.
 */
export const rubricScorer = createScorer({
  id: 'rubric',
  name: 'Expert content rubric',
  description: 'Judges a slide against the interesting-expert-content rules (0..1).',
})
  .analyze(async ({ run }) => {
    const output = run.output as { slide?: unknown; abortSignal?: AbortSignal };
    const slide = output?.slide ?? run.output;
    const verdict = await judge(slide, output?.abortSignal);
    return { result: verdict };
  })
  .generateScore(({ results }) => {
    const verdict = results?.analyzeStepResult?.result as z.infer<typeof RubricVerdict> | undefined;
    return verdict?.score ?? 0;
  })
  .generateReason(({ results }) => {
    const verdict = results?.analyzeStepResult?.result as z.infer<typeof RubricVerdict> | undefined;
    if (!verdict) return '';
    return verdict.fix || verdict.flags.map((f) => `règle enfreinte: ${f}`).join('; ');
  });

/** Convenience wrapper: score one slide, return { score, fix }. */
export async function scoreSlide(
  slide: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<{ score: number; fix: string }> {
  const res = await rubricScorer.run({ output: { slide, abortSignal } });
  return { score: res.score ?? 0, fix: (res.reason as string) ?? '' };
}
