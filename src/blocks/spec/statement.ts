/**
 * Statement block spec — single source of truth for the `statement` layout.
 *
 * Pilot migration (Wave-2 B1): authors the render Zod consts once, then reuses
 * them in both the `BlockSpec` (drives L1 emit / L3 AI / L4 prompt) and a
 * precise `z.object` render-schema literal (drives the L2 renderer type).
 *
 * Client-safety: imports ONLY zod + the client-safe dsl — never the emitter,
 * `_shared`, or any Payload/Next runtime — so it is loadable into the
 * `'use client'` renderer that re-exports `StatementBlockData` as a type.
 */
import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedString,
  optionalAi,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalLimitedRichTextRender,
  optionalRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

// Per-field render Zods — authored once, reused below.
// body + footer are rich text (Lexical); their render Zod is the editor state,
// while their AI Zod stays a markdown string (converted to Lexical on write).
const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const body = optionalLimitedRichTextRender(SLIDE_LIMITS.statement.body);
const footer = optionalLimitedRichTextRender(SLIDE_LIMITS.statement.footer);
// Layout variant (U8): four visually-distinct emphasis treatments. Optional —
// when unset, buildSlidesMd assigns one by statement-index so the deck gets
// variety even if the author/AI never picks (the Section-block lesson, KTD6b).
const STATEMENT_VARIANTS = ['centered-hero', 'pull-quote', 'big-statement', 'split'] as const;
const variant = optionalRender(z.enum(STATEMENT_VARIANTS));

export const statementSpec = block({
  slug: 'statement',
  blockType: 'statement',
  aiDraftable: true,
  labels: { singular: 'Affirmation', plural: 'Affirmations' },
  imageURL: '/block-previews/statement.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Citation ou affirmation principale'),
    rawField('body', body, optionalLimitedAi(SLIDE_LIMITS.statement.body), {
      type: 'richText',
      label: 'Corps',
      description: 'Texte développant l’affirmation',
      maxLength: SLIDE_LIMITS.statement.body.max,
    }),
    rawField('footer', footer, optionalLimitedAi(SLIDE_LIMITS.statement.footer), {
      type: 'richText',
      label: 'Pied de page',
      description: 'Légende ou note en bas de la diapositive',
      maxLength: SLIDE_LIMITS.statement.footer.max,
    }),
    rawField('variant', variant, optionalAi(z.enum(STATEMENT_VARIANTS)), {
      type: 'select',
      label: 'Variante de mise en page',
      description:
        'Disposition : centered-hero (centré), pull-quote (citation), big-statement (énoncé large), split (titre/texte). Laisser vide pour une alternance automatique.',
      options: STATEMENT_VARIANTS.map((v) => ({ label: v, value: v })),
    }),
    factoryField('preview', 'preview', z.any(), false),
  ],
  promptMeta: {
    index: 3,
    heading: 'statement',
    summary: 'Affirmation ou citation mise en avant',
    lines: [
      'eyebrow, title (obligatoire), body, footer',
      'variant: centered-hero | pull-quote | big-statement | split — varie la mise en page entre deux statements consécutifs (laisser vide = alternance auto)',
    ],
  },
});

/** Precise render schema — reuses the SAME render Zod consts, by name. */
export const statementRenderSchema = z.object({
  blockType: z.literal('statement'),
  eyebrow,
  title,
  body,
  footer,
  variant,
});

export type StatementBlockData = InferRender<typeof statementRenderSchema>;
export type StatementVariant = (typeof STATEMENT_VARIANTS)[number];
