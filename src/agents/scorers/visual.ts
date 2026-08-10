/**
 * Visual scorer — MULTIMODAL critique as a native Mastra Scorer. Judges the
 * REAL rendered slide PNG (from the Slidev build) for problems only visible
 * after layout: actual overflow/clipping, visual balance, contrast/legibility.
 * This is the expensive post-build tier of the advisor pattern — it runs once,
 * after the cheap rubric loop has converged, and only flags slides whose
 * rendered form fails even though their data passed the content rubric.
 *
 * Mastra-native + multimodal: the image part goes through the same CloudCLIProxy
 * gateway (vision-capable) via generateStructured.
 */
import { createScorer } from '@mastra/core/evals';
import { z } from 'zod';

import { boundVisualImage } from '../tools/visualImage';
import { generateStructured, type ImagePart } from '../model';

const VisualVerdict = z.object({
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('0..1 — visual quality of the rendered slide (1 = clean, balanced, legible)'),
  flags: z
    .array(z.enum(['overflow', 'cramped', 'low_contrast', 'unbalanced', 'clipped_text']))
    .describe('Rendered-layout problems visible in the image (empty if none)'),
  fix: z.string().describe('One imperative instruction to fix the worst visual issue'),
});

const VISUAL_INSTRUCTIONS = `Tu es un juge de design. On te montre l'IMAGE rendue d'une diapositive (telle que le public la voit). Tu évalues UNIQUEMENT ce qui est visible à l'écran :
- débordement / texte coupé hors du cadre,
- surcharge (trop d'éléments serrés),
- contraste / lisibilité insuffisants,
- déséquilibre visuel (colonne vide vs surchargée).

Tu IGNORES la qualité rédactionnelle (jugée ailleurs). Renvoie score 0..1, les défauts visibles, et UNE correction concrète.
- 1.0 : propre, aéré, lisible, équilibré.
- < 0.5 : déborde, coupé, ou illisible.`;

type VisualInput = { slide: Record<string, unknown>; image: ImagePart };

async function judgeVisual(input: VisualInput): Promise<z.infer<typeof VisualVerdict>> {
  return generateStructured({
    name: 'visualScorer',
    instructions: VISUAL_INSTRUCTIONS,
    schema: VisualVerdict,
    prompt: `Évalue le rendu visuel de cette diapositive (type: ${input.slide.blockType}, titre: ${String(input.slide.title ?? '')}).`,
    images: [input.image],
  });
}

export const visualScorer = createScorer({
  id: 'visual',
  name: 'Rendered slide visual quality',
  description: 'Judges a rendered slide PNG for overflow, balance, and legibility (0..1).',
})
  .analyze(async ({ run }) => {
    const verdict = await judgeVisual(run.output as VisualInput);
    return { result: verdict };
  })
  .generateScore(({ results }) => {
    const v = results?.analyzeStepResult?.result as z.infer<typeof VisualVerdict> | undefined;
    return v?.score ?? 0;
  })
  .generateReason(({ results }) => {
    const v = results?.analyzeStepResult?.result as z.infer<typeof VisualVerdict> | undefined;
    if (!v) return '';
    return v.fix || v.flags.join('; ');
  });

/** Convenience: score one rendered slide, return { score, fix }. */
export async function scoreVisual(
  slide: Record<string, unknown>,
  image: ImagePart,
): Promise<{ score: number; fix: string }> {
  const bounded = await boundVisualImage(image);
  const res = await visualScorer.run({ output: { slide, image: bounded } });
  return { score: res.score ?? 0, fix: (res.reason as string) ?? '' };
}
