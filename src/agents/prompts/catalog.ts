/**
 * Phase-specific prompt catalogue derived from the block-spec SSOT.
 *
 * Structure receives the complete layout catalogue and deck-level composition
 * rules. A slide writer receives only the already-selected layout guidance, so
 * it cannot be distracted by deck count, cover/closing, or unrelated layouts.
 */
import type { PromptMeta } from '../../blocks/spec/dsl';
import {
  buildSystemPrompt,
  emitPromptSection,
  promptMetaOf,
} from '../../blocks/spec/emit/emitPromptSection';
import { INFORMATIONAL_STYLE_PROMPT } from './style';
import {
  type DocumentTemplateDefinition,
  PRESENTATION_DOCUMENT_TEMPLATE,
  specsForDocumentTemplate,
} from '../../documents/templates';

function promptMetaForTemplate(template: DocumentTemplateDefinition) {
  return specsForDocumentTemplate(template).flatMap((spec) => {
    const meta = promptMetaOf(spec);
    return meta ? [meta] : [];
  });
}

export function buildStructureSystemPrompt(template: DocumentTemplateDefinition): string {
  return `${buildSystemPrompt(promptMetaForTemplate(template))}

Contraintes du template : ${template.agent.guidance}

${INFORMATIONAL_STYLE_PROMPT}`;
}

export const STRUCTURE_SYSTEM_PROMPT = buildStructureSystemPrompt(PRESENTATION_DOCUMENT_TEMPLATE);

export function buildWriterLayoutPrompt(
  blockType: string,
  template: DocumentTemplateDefinition = PRESENTATION_DOCUMENT_TEMPLATE,
): string {
  const meta: PromptMeta | undefined = promptMetaForTemplate(template).find(
    (candidate) => candidate.heading === blockType,
  );
  if (!meta) {
    throw new Error(`[prompt catalog] no AI layout guidance for blockType: ${blockType}`);
  }

  return `Layout imposé pour cette diapositive :
${emitPromptSection(meta)}

${INFORMATIONAL_STYLE_PROMPT}`;
}
