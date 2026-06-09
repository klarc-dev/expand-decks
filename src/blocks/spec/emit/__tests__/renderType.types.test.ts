/**
 * COMPILE-TIME proof that the L2 render-type derivation (z.infer of a render
 * `z.object` built from DSL render Zods) reproduces the current hand-written
 * `*BlockData` types EXACTLY.
 *
 * The real test is `tsc --noEmit`: every assertion below is `Expect<Equal<…>>`,
 * and `Equal` is bidirectional, so any structural drift becomes a compile error
 * (a mismatch makes `Equal` resolve to `false`, and `Expect<false>` fails
 * because `false` does not extend `true`). The runtime `it()` block exists only
 * so vitest counts this file.
 *
 * Covered blocks (chosen to exercise every render-optional shape):
 *   - statement : flat `?: string | null` optionals + required `title`
 *   - cover     : adds the image `?: { url: string } | null` shape + enum surface
 *   - twoCols   : nested `rightCards?: Array<{…; description?: string | null}> | null`
 *   - cardGrid  : nested `cards` with an optional `number` + enum-string `columns`
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { optionalRender, optionalRichTextRender } from '../../dsl';
import { type Equal, type Expect, type InferRender } from '../renderType';

import type { CardGridBlockData } from '../../../../export/blocks/cardGrid';
import type { CoverBlockData } from '../../../../export/blocks/cover';
import type { StatementBlockData } from '../../../../export/blocks/statement';
import type { TwoColsBlockData } from '../../../../export/blocks/twoCols';

// ---------------------------------------------------------------------------
// statement — flat optionals
// ---------------------------------------------------------------------------

const statementRenderSchema = z.object({
  blockType: z.literal('statement'),
  eyebrow: optionalRender(z.string()),
  title: z.string(),
  body: optionalRichTextRender(),
  footer: optionalRichTextRender(),
  variant: optionalRender(z.enum(['centered-hero', 'pull-quote', 'big-statement', 'split'])),
  surface: optionalRender(z.enum(['dark', 'light'])),
});

type DerivedStatement = InferRender<typeof statementRenderSchema>;

type _StatementMatches = Expect<Equal<DerivedStatement, StatementBlockData>>;

// ---------------------------------------------------------------------------
// cover — image `{ url: string } | null` + enum surface
// ---------------------------------------------------------------------------

const coverRenderSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow: optionalRender(z.string()),
  title: z.string(),
  subtitle: optionalRichTextRender(),
  footerLeft: optionalRichTextRender(),
  footerRight: optionalRichTextRender(),
  surface: optionalRender(z.enum(['dark', 'light', 'gradient'])),
  image: z.object({ url: z.string() }).nullable().optional(),
  imagePosition: optionalRender(z.enum(['right', 'left'])),
});

type DerivedCover = InferRender<typeof coverRenderSchema>;

type _CoverMatches = Expect<Equal<DerivedCover, CoverBlockData>>;

// ---------------------------------------------------------------------------
// twoCols — nested rightCards with `description?: string | null`
// ---------------------------------------------------------------------------

const twoColsRenderSchema = z.object({
  blockType: z.literal('twoCols'),
  eyebrow: optionalRender(z.string()),
  title: z.string(),
  intro: optionalRichTextRender(),
  leftFooter: optionalRichTextRender(),
  rightCards: z
    .array(
      z.object({
        title: z.string(),
        description: optionalRichTextRender(),
      }),
    )
    .nullable()
    .optional(),
  image: z.object({ url: z.string() }).nullable().optional(),
  imagePosition: optionalRender(z.enum(['right', 'left'])),
});

type DerivedTwoCols = InferRender<typeof twoColsRenderSchema>;

type _TwoColsMatches = Expect<Equal<DerivedTwoCols, TwoColsBlockData>>;

// ---------------------------------------------------------------------------
// cardGrid — nested cards with optional `number` + enum-string `columns`
// ---------------------------------------------------------------------------

const cardGridRenderSchema = z.object({
  blockType: z.literal('cardGrid'),
  eyebrow: optionalRender(z.string()),
  title: z.string(),
  sidebarText: optionalRichTextRender(),
  columns: optionalRender(z.enum(['2', '3', '4'])),
  cards: z
    .array(
      z.object({
        number: optionalRender(z.string()),
        title: z.string(),
        description: optionalRichTextRender(),
      }),
    )
    .nullable()
    .optional(),
});

type DerivedCardGrid = InferRender<typeof cardGridRenderSchema>;

type _CardGridMatches = Expect<Equal<DerivedCardGrid, CardGridBlockData>>;

describe('L2 render-type derivation', () => {
  it('type-level', () => {
    expect(true).toBe(true);
  });
});
