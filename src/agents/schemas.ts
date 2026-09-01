/**
 * Slides-native analogues of the documents-plugin dossier/stub shapes.
 *
 * The DeckDossier is the Gather phase output: the sourced, structured substrate
 * the Structure phase plans against. It is deliberately use-case-agnostic (no
 * legal/domain notions) and mirrors the "interesting expert content" research:
 * a single core idea, the audience, the so-what, key points, supporting data,
 * and sources.
 */
import { z } from 'zod';
import { EvidenceSchema } from '../lib/sources/types';

export type DeckEvidence = z.infer<typeof EvidenceSchema>;

export const DeckDossierSchema = z.object({
  coreIdea: z
    .string()
    .describe('The ONE core idea the whole deck must land. A full sentence, not a topic.'),
  audience: z.string().describe('Who this is for and what they already know.'),
  soWhat: z
    .string()
    .describe('Why the audience should care — the problem they own that this addresses.'),
  keyPoints: z
    .array(z.string())
    .min(1)
    .describe('Distinct supporting points, each a tight claim. The coverage unit for planning.'),
  data: z
    .array(z.string())
    .describe('Concrete facts, numbers, or examples that ground the points (may be empty).'),
  sources: z
    .array(z.string())
    .describe('Source references for the facts/claims, where available (may be empty).'),
  rawBrief: z
    .string()
    .describe(
      'The original natural-language brief, verbatim — used for the deterministic explicit-slide fast-path.',
    ),
  language: z
    .enum(['fr', 'en'])
    .describe('Resolved output language for every audience-facing slide.'),
});

export type DeckDossier = z.infer<typeof DeckDossierSchema>;
