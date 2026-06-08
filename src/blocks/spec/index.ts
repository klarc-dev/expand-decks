import type { BlockSpec } from './dsl';

import { cardGridSpec } from './cardGrid';
import { coverSpec } from './cover';
import { ctaSpec } from './cta';
import { markdownSpec } from './markdown';
import { quotesSpec } from './quotes';
import { sectionSpec } from './section';
import { statementSpec } from './statement';
import { statsSpec } from './stats';
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
  markdownSpec,
];
