import { z } from 'zod';

import {
  block,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  rawField,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
const surface = optionalRender(z.enum(['dark', 'light']));
const stats = optionalRender(
  z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
);

export const statsSpec = block({
  slug: 'stats',
  blockType: 'stats',
  aiDraftable: true,
  labels: { singular: 'Statistiques', plural: 'Statistiques' },
  imageURL: '/block-previews/stats.svg',
  fields: [
    factoryField('eyebrow', 'eyebrow', eyebrow, optionalAi(z.string())),
    factoryField('title', 'title', title, z.string(), {
      description: 'Titre principal de la diapositive',
    }),
    factoryField('surface', 'surface', surface, optionalAi(z.enum(['dark', 'light']))),
    rawField(
      'stats',
      z.array(z.unknown()),
      optionalAi(
        z.array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        ),
      ),
      {
        type: 'array',
        label: 'Chiffres clés',
        description: 'Paires valeur/libellé affichées en ligne',
        fields: [
          rawField('value', z.string(), z.string(), {
            type: 'text',
            required: true,
            label: 'Valeur',
            description: 'Chiffre ou donnée (ex. "360°", "4")',
          }),
          rawField('label', z.string(), z.string(), {
            type: 'text',
            required: true,
            label: 'Libellé',
            description: 'Description courte de la valeur',
          }),
        ],
      },
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 6,
    heading: 'stats',
    summary: 'Chiffres clés en grille',
    lines: ['eyebrow, title (obligatoire), surface', 'stats: [{value, label}]'],
  },
});

export const statsRenderSchema = z.object({
  blockType: z.literal('stats'),
  eyebrow,
  title,
  surface,
  stats,
});

export type StatsBlockData = InferRender<typeof statsRenderSchema>;
