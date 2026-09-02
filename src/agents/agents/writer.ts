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
- Les sources servent seulement à vérifier les faits ; les preuves sont conservées en métadonnées. Ne rédige jamais de rubrique bibliographique visible ("Sources :", "Références :", citations brutes).
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
  ]
    .filter(Boolean)
    .join('\n');
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
      ? `\n---\nDECK EXISTANT À RÉVISER :\n${revisionContext}\n\nPréserve les formulations, faits et éléments non concernés par la demande de révision. Modifie seulement ce qui est nécessaire pour satisfaire la demande.`
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
