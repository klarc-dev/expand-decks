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
const footer = optionalRender(z.string());

const step = z.object({
  label: z.string(),
  description: optionalRender(z.string()),
});
const steps = optionalRender(z.array(step));

const aiStep = z.object({
  label: z.string(),
  description: optionalAi(z.string()),
});

export const timelineSpec = block({
  slug: 'timeline',
  blockType: 'timeline',
  aiDraftable: true,
  labels: { singular: 'Frise', plural: 'Frises' },
  imageURL: '/block-previews/timeline.svg',
  fields: [
    factoryField('eyebrow', 'eyebrow', eyebrow, optionalAi(z.string())),
    factoryField('title', 'title', title, z.string(), {
      description: 'Titre de la frise',
    }),
    rawField('surface', surface, optionalAi(z.enum(['dark', 'light'])), {
      type: 'select',
      label: 'Surface',
      defaultValue: 'light',
      description: 'Apparence de fond de la diapositive',
      options: [
        { label: 'Clair', value: 'light' },
        { label: 'Sombre', value: 'dark' },
      ],
    }),
    rawField(
      'steps',
      z.array(z.unknown()),
      optionalAi(z.array(aiStep).min(2).max(6)),
      {
        type: 'array',
        label: 'Étapes',
        description: 'Étapes ordonnées, reliées de gauche à droite par des flèches (2 à 6)',
        fields: [
          rawField('label', z.string(), optionalAi(z.string()), {
            type: 'text',
            label: 'Étape',
            required: true,
            description: 'Nom court de l’étape',
          }),
          rawField('description', optionalRender(z.string()), optionalAi(z.string()), {
            type: 'textarea',
            label: 'Description',
            description: 'Texte court sous l’étape',
          }),
        ],
      },
    ),
    rawField('footer', footer, optionalAi(z.string()), {
      type: 'text',
      label: 'Pied de page',
      description: 'Bandeau transverse sous la frise (optionnel)',
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 10,
    heading: 'timeline',
    summary: 'Frise horizontale d’étapes ordonnées reliées par des flèches (cycle de vie, processus, parcours chronologique)',
    lines: [
      'eyebrow, title (obligatoire), surface ("light" | "dark"), footer (bandeau transverse)',
      'steps: [{label, description}] — 2 à 6 étapes, dans l’ordre, affichées de gauche à droite',
    ],
  },
});

export const timelineRenderSchema = z.object({
  blockType: z.literal('timeline'),
  eyebrow,
  title,
  surface,
  steps,
  footer,
});

export type TimelineBlockData = InferRender<typeof timelineRenderSchema>;
