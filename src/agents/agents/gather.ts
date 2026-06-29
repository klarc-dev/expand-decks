/**
 * Gather phase (documents-plugin `researcher` → dossier, slides-adapted).
 *
 * Turns a natural-language brief into a structured DeckDossier: the ONE core
 * idea, audience, so-what, key points, data, sources. When the author selected
 * external sources, this first queries them (via MCP tools) for grounded notes
 * and folds verified facts into the dossier's data/sources; with no sources it
 * is the original brief-only distillation.
 *
 * The LLM call uses a schema WITHOUT rawBrief (the model doesn't produce it).
 * rawBrief is injected after the call so the returned DeckDossier is complete.
 */
import type { Evidence } from '../../lib/sources/types';
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import { findInformationalStyleViolations, INFORMATIONAL_STYLE_PROMPT } from '../prompts/style';
import { DeckDossierSchema, type DeckDossier } from '../schemas';
import { researchSources } from './research';

const LLM_SCHEMA = DeckDossierSchema.omit({ rawBrief: true });

const GATHER_INSTRUCTIONS = `Tu es le chercheur. À partir d'un brief, tu produis un dossier structuré qui servira à planifier une présentation d'expert.

Tu extrais :
- coreIdea : LA seule idée maîtresse du deck (une phrase complète, pas un thème).
- audience : à qui s'adresse le deck et ce qu'il sait déjà.
- soWhat : pourquoi ce public doit s'en soucier — le problème qu'il possède.
- keyPoints : les points d'appui distincts (chacun une affirmation nette). C'est l'unité de couverture.
- data : faits, chiffres, exemples concrets qui ancrent les points (peut être vide).
- sources : références des faits/affirmations si disponibles (peut être vide).

${RUBRIC_PROMPT}

${INFORMATIONAL_STYLE_PROMPT}

Reste dans la langue du brief. Ne rédige pas de diapositives — seulement le dossier.`;

const RESEARCH_INSTRUCTIONS = `Tu es le chercheur. Tu disposes d'outils de recherche connectés à des bases de connaissances sélectionnées.

Interroge ces sources pour rassembler des faits, chiffres, exemples et références utiles au brief.
- N'utilise QUE ce que les sources renvoient réellement ; ne fabrique pas de citation ni de référence.
- Si une source ne contient rien de pertinent, ne l'invente pas — laisse le point sans appui sourcé.
- Reste factuel et concis ; pas de remplissage ni d'élargissement hors du brief.

Rends des notes structurées (faits + référence de source) que le dossier pourra absorber.`;

export type GatherResult = { dossier: DeckDossier; evidence: Evidence[] };

export async function gather(brief: string, sourceIds?: readonly string[]): Promise<GatherResult> {
  const { notes, evidence } = await researchSources(sourceIds, {
    name: 'gather:research',
    instructions: RESEARCH_INSTRUCTIONS,
    prompt: brief,
  });

  const prompt = notes
    ? `${brief}\n\n---\nNOTES DE RECHERCHE (issues des sources sélectionnées — n'utilise que ce qui est réellement pertinent, ne fabrique aucune citation) :\n${notes}`
    : brief;

  const dossier = await generateStructured({
    name: 'gather',
    instructions: GATHER_INSTRUCTIONS,
    schema: LLM_SCHEMA,
    prompt,
    validate: findInformationalStyleViolations,
    maxValidationRepairs: 3,
  });
  return { dossier: { ...dossier, rawBrief: brief }, evidence };
}
