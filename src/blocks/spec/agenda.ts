import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedArray,
  limitedString,
  limitedTextPayload,
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
const active = optionalRender(z.number());

const item = z.object({
  label: limitedString(SLIDE_LIMITS.agenda.label),
  description: optionalLimitedRender(SLIDE_LIMITS.agenda.description),
});
const items = optionalRender(limitedArray(item, SLIDE_LIMITS.agenda.items));

const aiItem = z.object({
  label: limitedString(SLIDE_LIMITS.agenda.label),
  description: optionalLimitedAi(SLIDE_LIMITS.agenda.description),
});

export const agendaSpec = block({
  slug: 'agenda',
  blockType: 'agenda',
  aiDraftable: true,
  labels: { singular: 'Programme', plural: 'Programmes' },
  imageURL: '/block-previews/agenda.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre du programme (ex. "Au programme")'),
    rawField('items', items, optionalAi(limitedArray(aiItem, SLIDE_LIMITS.agenda.items)), {
      type: 'array',
      label: 'Sections',
      description: `Laissez vide pour reprendre automatiquement les titres des blocs « Section » du plan. Remplissez pour personnaliser (${SLIDE_LIMITS.agenda.items.min} à ${SLIDE_LIMITS.agenda.items.max}), numérotées automatiquement.`,
      maxRows: SLIDE_LIMITS.agenda.items.max,
      fields: [
        rawField(
          'label',
          limitedString(SLIDE_LIMITS.agenda.label),
          limitedString(SLIDE_LIMITS.agenda.label),
          limitedTextPayload(SLIDE_LIMITS.agenda.label, {
            type: 'text',
            label: 'Section',
            required: true,
            description: 'Nom court de la section',
          }),
        ),
        rawField(
          'description',
          optionalLimitedRender(SLIDE_LIMITS.agenda.description),
          optionalLimitedAi(SLIDE_LIMITS.agenda.description),
          limitedTextPayload(SLIDE_LIMITS.agenda.description, {
            type: 'textarea',
            label: 'Description',
            description: 'Texte court sous la section (optionnel)',
          }),
        ),
      ],
    }),
    rawField('active', active, false, {
      type: 'number',
      label: 'Section active',
      description:
        'Position (1, 2, 3…) de la section en cours : elle est mise en avant, les autres atténuées. Vide = vue d’ensemble neutre. Dupliquez la slide entre les sections pour guider l’auditoire.',
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 12,
    heading: 'agenda',
    summary:
      'Plan / sommaire de la présentation — liste verticale numérotée des sections pour situer et guider l’auditoire',
    lines: [
      'eyebrow, title (obligatoire)',
      'items: [{label, description}] — dans l’ordre, numérotées automatiquement',
    ],
  },
});

export const agendaRenderSchema = z.object({
  blockType: z.literal('agenda'),
  eyebrow,
  title,
  items,
  active,
});

export type AgendaBlockData = InferRender<typeof agendaRenderSchema>;
