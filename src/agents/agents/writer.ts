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
import { ALL_SPECS } from '../../blocks/spec';
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';
import { DRAFT_SYSTEM_PROMPT } from '../prompts/catalog';
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import type { DeckDossier } from '../schemas';

const SPEC_BY_TYPE = new Map(ALL_SPECS.map((s) => [s.blockType, s]));

const WRITER_INSTRUCTIONS = `Tu es le rédacteur. Tu rédiges le contenu d'UNE seule diapositive déjà planifiée.

On te donne : le dossier (contexte resserré), le blockType et le title imposés de CETTE diapositive, son intention, et la liste des TITRES des autres diapositives (pour éviter les redites). Tu ne vois jamais le corps des autres diapositives.

${DRAFT_SYSTEM_PROMPT}

${RUBRIC_PROMPT}

Règles de rédaction :
- Conserve EXACTEMENT le blockType et le title imposés.
- Remplis tous les champs pertinents du layout à partir du dossier et de l'intention.
- Pour "table" : colonnes = en-têtes, rows = lignes alignées sur les colonnes.
- Textes concis et percutants ; reste dans la langue du dossier ; ne répète pas le contenu d'une autre diapositive.`;

function dossierExcerpt(dossier: DeckDossier): string {
  return [
    `IDÉE MAÎTRESSE : ${dossier.coreIdea}`,
    `PUBLIC : ${dossier.audience}`,
    dossier.data.length
      ? `DONNÉES DISPONIBLES :\n${dossier.data.map((d) => `- ${d}`).join('\n')}`
      : '',
    dossier.sources.length ? `SOURCES :\n${dossier.sources.map((s) => `- ${s}`).join('\n')}` : '',
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
): Promise<Record<string, unknown>> {
  const spec = SPEC_BY_TYPE.get(stub.blockType);
  if (!spec) {
    throw new Error(`[writer] unknown blockType: ${stub.blockType}`);
  }
  // markdown (aiDraftable:false) has no AI schema; emit a minimal block.
  if (!spec.aiDraftable) {
    return { blockType: stub.blockType, title: stub.title };
  }

  const { aiSchemaOf } = await import('../../blocks/spec/dsl');
  const schema = aiSchemaOf(spec);

  const prompt = [
    `DOSSIER :\n${dossierExcerpt(dossier)}`,
    `\n---\nDIAPOSITIVE À RÉDIGER MAINTENANT :\n- blockType (imposé) : ${stub.blockType}\n- title (imposé) : ${stub.title}\n- intention : ${stub.intent}`,
    otherTitles.length
      ? `\n---\nTITRES DES AUTRES DIAPOSITIVES (ne les redis pas) :\n${otherTitles.map((t) => `- ${t}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const block = await generateStructured<Record<string, unknown>>({
    name: `writer:${stub.blockType}`,
    instructions: WRITER_INSTRUCTIONS,
    schema: schema as never,
    prompt,
  });

  // alignBatch invariant: force the planned structure back onto the block.
  return { ...block, blockType: stub.blockType, title: stub.title };
}
