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
import { aiSchemaOf } from '../../blocks/spec/dsl';
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';
import { buildWriterLayoutPrompt } from '../prompts/catalog';
import { languageInstruction } from '../language';
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import { findFinalSlideViolations } from '../prompts/style';
import type { DeckDossier } from '../schemas';
import {
  type DocumentTemplateDefinition,
  documentTemplateSchemas,
  PRESENTATION_DOCUMENT_TEMPLATE,
  specsForDocumentTemplate,
} from '../../documents/templates';

function writerInstructions(
  blockType: string,
  dossier: DeckDossier,
  template: DocumentTemplateDefinition,
): string {
  return `Tu es le rédacteur de diapositives. Tu rédiges le contenu final visible d'UNE seule diapositive déjà planifiée, adapté au public réel décrit dans le dossier.

Ton rôle est de transformer une demande de sujet en contenu à enseigner, pas de vérifier si le brief contient déjà chaque phrase de la réponse. Lorsque l'auteur demande d'expliquer un métier, une notion, un processus ou une pratique, mobilise les connaissances générales établies nécessaires à cette explication. Le brief et les sources restent la seule autorité pour les faits propres à l’auteur, à son organisation, à ses clients ou à un cas ; ainsi que pour tout chiffre, date, citation, attribution, étude, actualité ou référence précise.

On te donne : le dossier (contexte resserré), le blockType et le title imposés de CETTE diapositive, son intention, et la liste des TITRES des autres diapositives (pour éviter les redites). Tu ne vois jamais le corps des autres diapositives.

${buildWriterLayoutPrompt(blockType, template)}

Contraintes du support : ${template.agent.guidance}

${RUBRIC_PROMPT}

${languageInstruction(dossier.language)}

Tu dois livrer le résultat final destiné au public, jamais commenter le travail de rédaction. Exécute l'intention : si elle demande un exemple, écris l'exemple lui-même avec les faits autorisés, l'analyse et la conclusion ; si elle demande une comparaison, écris la comparaison. Ne décris jamais ce qu’il faudrait écrire, ajouter, créer ou montrer dans une diapositive.

Règles de rédaction :
- Conserve EXACTEMENT le blockType et le title imposés.
- Sélectionne seulement les faits strictement nécessaires à l'intention de CETTE diapositive ; n’utilise pas tous les points du dossier par réflexe.
- Donne à chaque champ une fonction distincte : le corps développe le titre ; un footer ajoute une réserve, une source ou une conséquence pratique, sinon laisse-le vide. Ne reformule pas la même idée dans le titre, le corps et footer.
- Rôles des extrémités : une cover donne l’orientation (sujet, public, portée) sans résumer toute la démonstration ; une cta convertit le deck en action, livrable ou prochaine étape et ne résume pas les diapositives précédentes.
- Remplis seulement les champs utiles du layout à partir du dossier et de l'intention ; un champ optionnel inutile reste vide.
- N’ajoute aucun fait propre à l’auteur, à son organisation, à ses clients ou à un cas ; ni chiffre, date, citation, attribution, étude, actualité, effet causal, recommandation personnalisée ou référence précise qui ne découle pas directement du dossier. Les connaissances générales établies nécessaires pour expliquer le sujet demandé sont autorisées. Si un détail concret ou spécifique n’est pas autorisé, reste général au lieu de l’inventer.
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
    dossier.references?.length
      ? `RÉFÉRENCES AUTORISÉES POUR LES FOOTNOTES :\n${dossier.references
          .map((reference) => `- ${reference}`)
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function existingSlideForStub(
  revisionContext: string | undefined,
  stub: OutlineStub,
  template: DocumentTemplateDefinition,
): Record<string, unknown> | null {
  if (!revisionContext || !stub.intent.includes('Préserve intégralement')) return null;
  try {
    const embedded = stub.intent.match(/Contenu existant\s*:\s*(\{[\s\S]*\})\s*$/)?.[1];
    if (embedded) {
      return documentTemplateSchemas(template).aiPage.parse(JSON.parse(embedded)) as Record<
        string,
        unknown
      >;
    }

    const slides = JSON.parse(revisionContext);
    if (!Array.isArray(slides)) return null;
    const slide = slides.find(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        candidate.blockType === stub.blockType &&
        candidate.title === stub.title,
    );
    return slide
      ? (documentTemplateSchemas(template).aiPage.parse(slide) as Record<string, unknown>)
      : null;
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
  template: DocumentTemplateDefinition = PRESENTATION_DOCUMENT_TEMPLATE,
): Promise<Record<string, unknown>> {
  const existingSlide = existingSlideForStub(revisionContext, stub, template);
  if (existingSlide) return existingSlide;
  const isTargetedRevision = Boolean(revisionContext);

  const spec = specsForDocumentTemplate(template).find(
    (candidate) => candidate.blockType === stub.blockType,
  );
  if (!spec) {
    throw new Error(`[writer] unknown blockType: ${stub.blockType}`);
  }
  if (!spec.aiDraftable) {
    return { blockType: stub.blockType, title: stub.title };
  }

  const prompt = [
    `DOSSIER :\n${dossierExcerpt(dossier)}`,
    `\n---\nDIAPOSITIVE À RÉDIGER MAINTENANT :\n- blockType (imposé) : ${stub.blockType}\n${isTargetedRevision ? `- title existant (modifiable si la demande le requiert) : ${stub.title}` : `- title (imposé) : ${stub.title}`}\n- intention : ${stub.intent}`,
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
    instructions: `${writerInstructions(stub.blockType, dossier, template)}${
      isTargetedRevision
        ? '\n- Révision ciblée : le blockType reste imposé, mais le titre peut changer lorsque la demande le requiert.'
        : ''
    }`,
    schema: aiSchemaOf(spec) as never,
    prompt,
    validate: findFinalSlideViolations,
    maxValidationRepairs: 3,
    abortSignal,
  });

  // alignBatch invariant: force the planned structure back onto the block.
  // A targeted revision may rename the slide, but never change its layout.
  return documentTemplateSchemas(template).aiPage.parse({
    ...block,
    blockType: stub.blockType,
    title: isTargetedRevision ? block.title : stub.title,
  }) as Record<string, unknown>;
}
