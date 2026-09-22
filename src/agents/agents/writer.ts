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
import type { RequestContext } from '@mastra/core/request-context';

import { generateStructured } from '../model';
import { withDeckLanguage } from '../requestContext';
import { buildWriterInstructions } from '../prompts/phases';
import { findFinalSlideViolations } from '../prompts/style';
import type { DeckDossier } from '../schemas';
import {
  type DocumentTemplateDefinition,
  documentTemplateSchemas,
  PRESENTATION_DOCUMENT_TEMPLATE,
  specsForDocumentTemplate,
} from '../../documents/templates';

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

type WriteSlideOptions = {
  forceRewrite?: boolean;
  currentSlide?: Record<string, unknown>;
};

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
  requestContext?: RequestContext<any>,
  options: WriteSlideOptions = {},
): Promise<Record<string, unknown>> {
  const existingSlide = options.forceRewrite
    ? null
    : existingSlideForStub(revisionContext, stub, template);
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
    options.currentSlide
      ? `\n---\nCONTENU ACTUEL À COMPACTER :\n${JSON.stringify(options.currentSlide)}\n\nRéécris ce contenu existant au lieu de repartir de zéro. Préserve les affirmations factuelles, citations, références, réserves et message essentiel ; réduis seulement la densité demandée par l’intention.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const block = await generateStructured<Record<string, unknown>>({
    name: `writer:${stub.blockType}`,
    instructions: `${buildWriterInstructions(stub.blockType, template)}${
      isTargetedRevision
        ? '\n- Révision ciblée : le blockType reste imposé, mais le titre peut changer lorsque la demande le requiert.'
        : ''
    }`,
    schema: aiSchemaOf(spec) as never,
    prompt,
    validate: findFinalSlideViolations,
    maxValidationRepairs: 3,
    requestContext: withDeckLanguage(requestContext, dossier.language),
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
