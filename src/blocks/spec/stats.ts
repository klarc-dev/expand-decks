import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedArray,
  limitedArrayPayload,
  limitedString,
  limitedTextPayload,
  nonBlankLimitedString,
  optionalAi,
  optionalLimitedRender,
  optionalRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const stats = optionalRender(
  limitedArray(
    z.object({
      value: limitedString(SLIDE_LIMITS.stats.value),
      label: limitedString(SLIDE_LIMITS.stats.label),
    }),
    SLIDE_LIMITS.stats.items,
  ),
);

export const statsSpec = block({
  slug: 'stats',
  blockType: 'stats',
  aiDraftable: true,
  labels: { singular: 'Statistiques', plural: 'Statistiques' },
  imageURL: '/block-previews/stats.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre principal de la diapositive'),
    rawField(
      'stats',
      stats,
      limitedArray(
        z.object({
          value: nonBlankLimitedString(SLIDE_LIMITS.stats.value),
          label: nonBlankLimitedString(SLIDE_LIMITS.stats.label),
        }),
        SLIDE_LIMITS.stats.items,
      ),
      limitedArrayPayload(SLIDE_LIMITS.stats.items, {
        type: 'array',
        label: 'Chiffres clés',
        description: 'Paires valeur/libellé affichées en ligne',
        fields: [
          rawField(
            'value',
            limitedString(SLIDE_LIMITS.stats.value),
            limitedString(SLIDE_LIMITS.stats.value),
            limitedTextPayload(SLIDE_LIMITS.stats.value, {
              type: 'text',
              required: true,
              label: 'Valeur',
              description: 'Chiffre ou donnée (ex. "360°", "4")',
            }),
          ),
          rawField(
            'label',
            limitedString(SLIDE_LIMITS.stats.label),
            limitedString(SLIDE_LIMITS.stats.label),
            limitedTextPayload(SLIDE_LIMITS.stats.label, {
              type: 'text',
              required: true,
              label: 'Libellé',
              description: 'Description courte de la valeur',
            }),
          ),
        ],
      }),
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 6,
    heading: 'stats',
    summary: 'Chiffres clés en grille',
    lines: ['eyebrow, title (obligatoire)', 'stats: [{value, label}]'],
  },
});

export const statsRenderSchema = z.object({
  blockType: z.literal('stats'),
  eyebrow,
  title,
  stats,
});

export type StatsBlockData = InferRender<typeof statsRenderSchema>;
