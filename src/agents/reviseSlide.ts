import { parseAiSlide, SPEC_BY_TYPE } from '../blocks/spec';
import { aiSchemaOf } from '../blocks/spec/dsl';
import {
  type DocumentTemplateDefinition,
  PRESENTATION_DOCUMENT_TEMPLATE,
} from '../documents/templates';
import type { RequestContext } from '@mastra/core/request-context';

import type { DeckLanguage } from './language';
import { generateStructured } from './model';
import { withDeckLanguage } from './requestContext';
import { buildWriterLayoutPrompt } from './prompts/catalog';
import { findFinalSlideViolations } from './prompts/style';

/**
 * Rewrite one existing slide, preserving its selected layout and using its
 * block schema. `template` carries the document's medium constraints (a
 * one-page sales sheet is not revised like a presentation slide).
 */
export async function reviseSlide({
  instruction,
  language,
  slide,
  template = PRESENTATION_DOCUMENT_TEMPLATE,
  requestContext,
}: {
  instruction: string;
  language: DeckLanguage;
  slide: Record<string, unknown>;
  template?: DocumentTemplateDefinition;
  requestContext?: RequestContext<any>;
}): Promise<Record<string, unknown>> {
  const blockType = typeof slide.blockType === 'string' ? slide.blockType : '';
  const spec = SPEC_BY_TYPE.get(blockType);
  if (!spec) throw new Error(`Unknown slide blockType: ${blockType}`);
  if (!spec.aiDraftable) throw new Error(`Slide blockType is not AI-draftable: ${blockType}`);

  const result = await generateStructured<Record<string, unknown>>({
    name: `slide-revision:${blockType}`,
    instructions: `Tu révises UNE seule diapositive existante, sans toucher au reste de la présentation. Livre la diapositive finale destinée au public, pas une description de la tâche d'édition. Ne décris jamais ce qu'il faudrait écrire, ajouter, créer ou montrer : écris le résultat demandé lui-même.\n\n${buildWriterLayoutPrompt(blockType, template)}\n\nContraintes du support : ${template.agent.guidance}\n\nConserve le blockType imposé. Préserve les faits et éléments non concernés. Applique seulement la demande de l'auteur.`,
    schema: aiSchemaOf(spec) as never,
    prompt: `DIAPOSITIVE EXISTANTE :\n${JSON.stringify(slide, null, 2)}\n\n---\n\nDEMANDE DE MODIFICATION :\n${instruction}`,
    validate: findFinalSlideViolations,
    maxValidationRepairs: 3,
    requestContext: withDeckLanguage(requestContext, language),
  });

  return parseAiSlide({ ...result, blockType });
}
