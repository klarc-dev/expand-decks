import { z } from 'zod';

import type { BlockSpec } from './dsl';
import { aiSchemaOf, renderSchemaOf } from './dsl';
import { emitOutlineSchema, emitSlidesArraySchema } from './emit/emitDraftSchema';

import { agendaSpec } from './agenda';
import { cardGridSpec } from './cardGrid';
import { coverSpec } from './cover';
import { ctaSpec } from './cta';
import { markdownSpec } from './markdown';
import { mermaidSpec } from './mermaid';
import { quotesSpec } from './quotes';
import { sectionSpec } from './section';
import { statementSpec } from './statement';
import { statsSpec } from './stats';
import { tableSpec } from './table';
import { timelineSpec } from './timeline';
import { twoColsSpec } from './twoCols';

// Ordered to match the slides blocks array in src/collections/Presentations.ts.
// Drives L3 (emitSlidesArraySchema) and L4 (buildSystemPrompt) in the draft route.
export const ALL_SPECS: BlockSpec[] = [
  coverSpec,
  sectionSpec,
  statementSpec,
  twoColsSpec,
  cardGridSpec,
  statsSpec,
  quotesSpec,
  ctaSpec,
  tableSpec,
  timelineSpec,
  mermaidSpec,
  agendaSpec,
  markdownSpec,
];

export const AI_SPECS = ALL_SPECS.filter((spec) => spec.aiDraftable);
export const SPEC_BY_TYPE = new Map(ALL_SPECS.map((spec) => [spec.blockType, spec]));
export const AI_SPEC_BY_TYPE = new Map(AI_SPECS.map((spec) => [spec.blockType, spec]));
export const AI_SLIDE_SCHEMA = z.union(AI_SPECS.map(aiSchemaOf));
export const AI_SLIDES_SCHEMA = emitSlidesArraySchema(ALL_SPECS);
export const OUTLINE_SCHEMA = emitOutlineSchema(ALL_SPECS);
export const RENDER_SLIDE_SCHEMA = z.union(ALL_SPECS.map(renderSchemaOf));

export function parseAiSlide(value: unknown) {
  return AI_SLIDE_SCHEMA.parse(value);
}

export function parseAiSlides(value: unknown) {
  return z.array(AI_SLIDE_SCHEMA).parse(value);
}
