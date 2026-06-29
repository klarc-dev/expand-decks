/**
 * Prompt catalog — derives DRAFT_SYSTEM_PROMPT from the block-spec SSOT
 * (ALL_SPECS + buildSystemPrompt). Single source for the layout-catalogue prompt
 * shared by the structure and writer agents; replaces the import that previously
 * came from src/lib/draftPresentation.
 */
import { ALL_SPECS } from '../../blocks/spec';
import { buildSystemPrompt } from '../../blocks/spec/emit/emitPromptSection';
import { INFORMATIONAL_STYLE_PROMPT } from './style';

export const DRAFT_SYSTEM_PROMPT = `${buildSystemPrompt(
  ALL_SPECS.flatMap((spec) => (spec.promptMeta ? [spec.promptMeta] : [])),
)}

${INFORMATIONAL_STYLE_PROMPT}`;
