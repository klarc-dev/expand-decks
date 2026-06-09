import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  rawField,
  richTextRender,
  titleFieldSpec,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
const quotes = optionalRender(
  z.array(
    z.object({
      quote: richTextRender(),
      authorName: z.string(),
      authorRole: optionalRender(z.string()),
    }),
  ),
);

export const quotesSpec = block({
  slug: 'quotes',
  blockType: 'quotes',
  aiDraftable: true,
  labels: { singular: 'Citations', plural: 'Citations' },
  imageURL: '/block-previews/quotes.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre de la diapositive'),
    rawField(
      'quotes',
      z.array(z.unknown()),
      optionalAi(
        z.array(
          z.object({
            quote: z.string(),
            authorName: z.string(),
            authorRole: optionalAi(z.string()),
          }),
        ),
      ),
      {
        type: 'array',
        label: 'Citations',
        description: 'Liste des citations à afficher en grille',
        fields: [
          rawField('quote', richTextRender(), z.string(), {
            type: 'richText',
            required: true,
            label: 'Citation',
            description: 'Texte de la citation',
          }),
          rawField('authorName', z.string(), z.string(), {
            type: 'text',
            required: true,
            label: 'Auteur',
            description: 'Nom de l’auteur cité',
          }),
          rawField('authorRole', optionalRender(z.string()), optionalAi(z.string()), {
            type: 'text',
            label: 'Rôle de l’auteur',
            description: 'Fonction ou contexte (optionnel)',
          }),
        ],
      },
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 7,
    heading: 'quotes',
    summary: 'Grille de citations',
    lines: ['eyebrow, title (obligatoire)', 'quotes: [{quote, authorName, authorRole}]'],
  },
});

export const quotesRenderSchema = z.object({
  blockType: z.literal('quotes'),
  eyebrow,
  title,
  quotes,
});

export type QuotesBlockData = InferRender<typeof quotesRenderSchema>;
