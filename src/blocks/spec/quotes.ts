import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedArray,
  limitedArrayPayload,
  limitedRichTextRender,
  limitedString,
  limitedTextPayload,
  nonBlankLimitedString,
  optionalAi,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const quotes = optionalRender(
  limitedArray(
    z.object({
      quote: limitedRichTextRender(SLIDE_LIMITS.quotes.quote),
      authorName: limitedString(SLIDE_LIMITS.quotes.authorName),
      authorRole: optionalLimitedRender(SLIDE_LIMITS.quotes.authorRole),
    }),
    SLIDE_LIMITS.quotes.items,
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
      quotes,
      limitedArray(
        z.object({
          quote: nonBlankLimitedString(SLIDE_LIMITS.quotes.quote),
          authorName: nonBlankLimitedString(SLIDE_LIMITS.quotes.authorName),
          authorRole: optionalLimitedAi(SLIDE_LIMITS.quotes.authorRole),
        }),
        SLIDE_LIMITS.quotes.items,
      ),
      limitedArrayPayload(SLIDE_LIMITS.quotes.items, {
        type: 'array',
        label: 'Citations',
        description: 'Liste des citations à afficher en grille',
        fields: [
          rawField(
            'quote',
            limitedRichTextRender(SLIDE_LIMITS.quotes.quote),
            limitedString(SLIDE_LIMITS.quotes.quote),
            limitedTextPayload(SLIDE_LIMITS.quotes.quote, {
              type: 'richText',
              required: true,
              label: 'Citation',
              description: 'Texte de la citation',
            }),
          ),
          rawField(
            'authorName',
            limitedString(SLIDE_LIMITS.quotes.authorName),
            limitedString(SLIDE_LIMITS.quotes.authorName),
            limitedTextPayload(SLIDE_LIMITS.quotes.authorName, {
              type: 'text',
              required: true,
              label: 'Auteur',
              description: 'Nom de l’auteur cité',
            }),
          ),
          rawField(
            'authorRole',
            optionalLimitedRender(SLIDE_LIMITS.quotes.authorRole),
            optionalLimitedAi(SLIDE_LIMITS.quotes.authorRole),
            limitedTextPayload(SLIDE_LIMITS.quotes.authorRole, {
              type: 'text',
              label: 'Rôle de l’auteur',
              description: 'Fonction ou contexte (optionnel)',
            }),
          ),
        ],
      }),
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
