/**
 * Draft phase (documents-plugin `writer`, slides-adapted).
 *
 * Drafts EXACTLY ONE slide per invocation, against that slide's block-specific
 * schema (aiSchemaOf for its blockType). Enforces the documents-plugin STRICT
 * SMALL-CONTEXT discipline: the writer sees only its own stub intent, the
 * relevant dossier excerpt, and the TITLES (never bodies) of the other slides.
 * The runtime drives this with `.foreach` over the stubs; the persisted
 * blockType/title are force-locked back to the stub (the `alignBatch` invariant)
 * so a model substitution can't drift the structure.
 */
import { parseAiSlide, SPEC_BY_TYPE } from '../../blocks/spec';
import { aiSchemaOf } from '../../blocks/spec/dsl';
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';
import { buildWriterLayoutPrompt } from '../prompts/catalog';
import { languageInstruction } from '../language';
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import { findInformationalStyleViolations } from '../prompts/style';
import type { DeckDossier } from '../schemas';

function writerInstructions(blockType: string, dossier: DeckDossier): string {
  return `Tu es le rédacteur pédagogique. Tu rédiges le contenu d'UNE seule diapositive de formation de niveau expert déjà planifiée.

On te donne : le dossier (contexte resserré), le blockType et le title imposés de CETTE diapositive, son intention, et la liste des TITRES des autres diapositives (pour éviter les redites). Tu ne vois jamais le corps des autres diapositives.

${buildWriterLayoutPrompt(blockType)}

${RUBRIC_PROMPT}

${languageInstruction(dossier.language)}

Règles de rédaction :
- Conserve EXACTEMENT le blockType et le title imposés.
- Remplis tous les champs pertinents du layout à partir du dossier et de l'intention.
- N’ajoute aucun fait, chiffre, attribution, cas, effet causal, critère ou recommandation qui ne découle pas directement du dossier. Si le dossier n’autorise pas un détail concret, reste général au lieu de l’inventer.
- Pour "table" : colonnes = en-têtes, rows = lignes alignées sur les colonnes.
- Utilise le champ footnotes pour rattacher les affirmations vérifiables aux références disponibles. Cite la norme, l’article, l’auteur ou l’organisme de façon courte ; n’invente jamais une référence. Les footnotes sont des sources de la diapositive, pas une bibliographie autonome.
- Pour un contenu juridique ou normatif, remplace toute formule générale par la règle exacte, ses conditions cumulatives, son exception ou incertitude, puis sa conséquence pratique. Mentionne les articles et dates disponibles.
- Évite les adjectifs d’évaluation et le métadiscours ("clair", "complet", "robuste", "essentiel", "pertinent", "il est important de", "il convient de noter"). Chaque phrase doit apporter un critère, une distinction, une obligation, une date, une conséquence, une réserve ou une action.
- Textes concis et factuels ; reste dans la langue du dossier ; ne répète pas le contenu d'une autre diapositive.`;
}

function dossierExcerpt(dossier: DeckDossier): string {
  return [
    `IDÉE MAÎTRESSE : ${dossier.coreIdea}`,
    `PUBLIC : ${dossier.audience}`,
    `POURQUOI ÇA COMPTE : ${dossier.soWhat}`,
    `POINTS AUTORISÉS :\n${dossier.keyPoints.map((point) => `- ${point}`).join('\n')}`,
    dossier.data.length
      ? `DONNÉES DISPONIBLES :\n${dossier.data.map((d) => `- ${d}`).join('\n')}`
      : '',
    dossier.references?.length || dossier.sources.length
      ? `RÉFÉRENCES AUTORISÉES POUR LES FOOTNOTES :\n${[
          ...(dossier.references ?? []),
          ...dossier.sources,
        ]
          .map((source) => `- ${source}`)
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function existingSlideForStub(
  revisionContext: string | undefined,
  stub: OutlineStub,
): Record<string, unknown> | null {
  if (!revisionContext || !stub.intent.includes('Préserve intégralement')) return null;
  try {
    const slides = JSON.parse(revisionContext);
    if (!Array.isArray(slides)) return null;
    const slide = slides.find(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        candidate.blockType === stub.blockType &&
        candidate.title === stub.title,
    );
    return slide ? parseAiSlide(slide) : null;
  } catch {
    return null;
  }
}

/**
 * Draft one slide. `otherTitles` is every OTHER stub's title (small-context:
 * titles only, never bodies). Returns the block with blockType/title force-locked
 * to the stub.
 */
export async function writeSlide(
  stub: OutlineStub,
  dossier: DeckDossier,
  otherTitles: string[],
  revisionContext?: string,
  abortSignal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const existingSlide = existingSlideForStub(revisionContext, stub);
  if (existingSlide) return existingSlide;

  const spec = SPEC_BY_TYPE.get(stub.blockType);
  if (!spec) {
    throw new Error(`[writer] unknown blockType: ${stub.blockType}`);
  }
  if (!spec.aiDraftable) {
    return { blockType: stub.blockType, title: stub.title };
  }

  const prompt = [
    `DOSSIER :\n${dossierExcerpt(dossier)}`,
    `\n---\nDIAPOSITIVE À RÉDIGER MAINTENANT :\n- blockType (imposé) : ${stub.blockType}\n- title (imposé) : ${stub.title}\n- intention : ${stub.intent}`,
    otherTitles.length
      ? `\n---\nTITRES DES AUTRES DIAPOSITIVES (ne les redis pas) :\n${otherTitles.map((t) => `- ${t}`).join('\n')}`
      : '',
    revisionContext
      ? `\n---\nDEMANDE DE RÉVISION :\n${dossier.rawBrief}\n\nDECK EXISTANT À RÉVISER :\n${revisionContext}\n\nApplique uniquement la demande de révision ci-dessus. Préserve mot pour mot les formulations, faits, exemples et champs non concernés. Si cette diapositive n'est pas concernée, reproduis son contenu existant sans modification.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const block = await generateStructured<Record<string, unknown>>({
    name: `writer:${stub.blockType}`,
    instructions: writerInstructions(stub.blockType, dossier),
    schema: aiSchemaOf(spec) as never,
    prompt,
    validate: findInformationalStyleViolations,
    maxValidationRepairs: 3,
    abortSignal,
  });

  // alignBatch invariant: force the planned structure back onto the block.
  return parseAiSlide({ ...block, blockType: stub.blockType, title: stub.title });
}
