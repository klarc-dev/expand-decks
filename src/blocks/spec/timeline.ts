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
  optionalLimitedAi,
  optionalLimitedRender,
  optionalRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const footer = optionalLimitedRender(SLIDE_LIMITS.timeline.footer);

const step = z.object({
  label: limitedString(SLIDE_LIMITS.timeline.label),
  description: optionalLimitedRender(SLIDE_LIMITS.timeline.description),
});
const steps = optionalRender(limitedArray(step, SLIDE_LIMITS.timeline.steps));

const aiStep = z.object({
  label: nonBlankLimitedString(SLIDE_LIMITS.timeline.label),
  description: optionalLimitedAi(SLIDE_LIMITS.timeline.description),
});

export const timelineSpec = block({
  slug: 'timeline',
  blockType: 'timeline',
  aiDraftable: true,
  labels: { singular: 'Frise', plural: 'Frises' },
  imageURL: '/block-previews/timeline.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre de la frise'),
    rawField(
      'steps',
      steps,
      limitedArray(aiStep, SLIDE_LIMITS.timeline.steps),
      limitedArrayPayload(SLIDE_LIMITS.timeline.steps, {
        type: 'array',
        label: 'Étapes',
        description: `Étapes ordonnées, reliées par une ligne de progression (${SLIDE_LIMITS.timeline.steps.min} à ${SLIDE_LIMITS.timeline.steps.max})`,
        fields: [
          rawField(
            'label',
            limitedString(SLIDE_LIMITS.timeline.label),
            limitedString(SLIDE_LIMITS.timeline.label),
            limitedTextPayload(SLIDE_LIMITS.timeline.label, {
              type: 'text',
              label: 'Étape',
              required: true,
              description: 'Nom court de l’étape',
            }),
          ),
          rawField(
            'description',
            optionalLimitedRender(SLIDE_LIMITS.timeline.description),
            optionalLimitedAi(SLIDE_LIMITS.timeline.description),
            limitedTextPayload(SLIDE_LIMITS.timeline.description, {
              type: 'textarea',
              label: 'Description',
              description: 'Texte court sous l’étape',
            }),
          ),
        ],
      }),
    ),
    rawField(
      'footer',
      footer,
      optionalLimitedAi(SLIDE_LIMITS.timeline.footer),
      limitedTextPayload(SLIDE_LIMITS.timeline.footer, {
        type: 'text',
        label: 'Pied de page',
        description: 'Bandeau transverse sous la frise (optionnel)',
      }),
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 10,
    heading: 'timeline',
    summary:
      'Frise d’étapes ordonnées reliées par une ligne de progression (cycle de vie, processus, parcours chronologique)',
    lines: [
      'eyebrow, title (obligatoire), footer (bandeau transverse)',
      'steps: [{label, description}] — dans l’ordre ; la mise en page s’adapte (rail horizontal pour les étapes courtes, vertical pour les plus longues)',
    ],
  },
});

export const timelineRenderSchema = z.object({
  blockType: z.literal('timeline'),
  eyebrow,
  title,
  steps,
  footer,
});

export type TimelineBlockData = InferRender<typeof timelineRenderSchema>;
