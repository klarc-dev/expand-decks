import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  rawField,
  titleFieldSpec,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
const active = optionalRender(z.number());

const item = z.object({
  label: z.string(),
  description: optionalRender(z.string()),
});
const items = optionalRender(z.array(item));

const aiItem = z.object({
  label: z.string(),
  description: optionalAi(z.string()),
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
    rawField('items', z.array(z.unknown()), optionalAi(z.array(aiItem).min(2).max(8)), {
      type: 'array',
      label: 'Sections',
      description:
        'Laissez vide pour reprendre automatiquement les titres des blocs « Section » du plan. Remplissez pour personnaliser (2 à 8), numérotées automatiquement.',
      fields: [
        rawField('label', z.string(), optionalAi(z.string()), {
          type: 'text',
          label: 'Section',
          required: true,
          description: 'Nom court de la section',
        }),
        rawField('description', optionalRender(z.string()), optionalAi(z.string()), {
          type: 'textarea',
          label: 'Description',
          description: 'Texte court sous la section (optionnel)',
        }),
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
      'items: [{label, description}] — 2 à 8 sections, dans l’ordre, numérotées automatiquement',
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
