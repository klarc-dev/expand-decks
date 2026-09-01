/**
 * Phase-specific prompt catalogue derived from the block-spec SSOT.
 *
 * Structure receives the complete layout catalogue and deck-level composition
 * rules. A slide writer receives only the already-selected layout guidance, so
 * it cannot be distracted by deck count, cover/closing, or unrelated layouts.
 */
import { ALL_SPECS } from '../../blocks/spec';
import type { PromptMeta } from '../../blocks/spec/dsl';
import {
  buildSystemPrompt,
  emitPromptSection,
  promptMetaOf,
} from '../../blocks/spec/emit/emitPromptSection';
import { INFORMATIONAL_STYLE_PROMPT } from './style';

const PROMPT_META = ALL_SPECS.flatMap((spec) => {
  const meta = promptMetaOf(spec);
  return meta ? [meta] : [];
});
const META_BY_BLOCK_TYPE = new Map(
  ALL_SPECS.flatMap((spec) => {
    const meta = promptMetaOf(spec);
    return meta ? [[spec.blockType, meta] as const] : [];
  }),
);

export const STRUCTURE_SYSTEM_PROMPT = `${buildSystemPrompt(PROMPT_META)}

${INFORMATIONAL_STYLE_PROMPT}`;

export function buildWriterLayoutPrompt(blockType: string): string {
  const meta: PromptMeta | undefined = META_BY_BLOCK_TYPE.get(blockType);
  if (!meta) {
    throw new Error(`[prompt catalog] no AI layout guidance for blockType: ${blockType}`);
  }

  return `Layout imposé pour cette diapositive :
${emitPromptSection(meta)}

${INFORMATIONAL_STYLE_PROMPT}`;
}
