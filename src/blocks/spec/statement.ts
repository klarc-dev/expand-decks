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
  optionalAi,
  optionalRender,
  optionalRichTextRender,
  rawField,
  titleFieldSpec,
} from './dsl';

// Per-field render Zods — authored once, reused below.
// body + footer are rich text (Lexical); their render Zod is the editor state,
// while their AI Zod stays a markdown string (converted to Lexical on write).
const eyebrow = optionalRender(z.string());
const title = z.string();
const body = optionalRichTextRender();
const footer = optionalRichTextRender();

export const statementSpec = block({
  slug: 'statement',
  blockType: 'statement',
  aiDraftable: true,
  labels: { singular: 'Affirmation', plural: 'Affirmations' },
  imageURL: '/block-previews/statement.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Citation ou affirmation principale'),
    rawField('body', body, optionalAi(z.string()), {
      type: 'richText',
      label: 'Corps',
      description: 'Texte développant l’affirmation',
    }),
    rawField('footer', footer, optionalAi(z.string()), {
      type: 'richText',
      label: 'Pied de page',
      description: 'Légende ou note en bas de la diapositive',
    }),
    factoryField('preview', 'preview', z.any(), false),
  ],
  promptMeta: {
    index: 3,
    heading: 'statement',
    summary: 'Affirmation ou citation mise en avant',
    lines: ['eyebrow, title (obligatoire), body, footer'],
  },
});

/** Precise render schema — reuses the SAME render Zod consts, by name. */
export const statementRenderSchema = z.object({
  blockType: z.literal('statement'),
  eyebrow,
  title,
  body,
  footer,
});

export type StatementBlockData = InferRender<typeof statementRenderSchema>;
