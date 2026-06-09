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

const eyebrow = optionalRender(z.string());
const title = z.string();
const subtitle = optionalRichTextRender();
const primaryAction = optionalRender(z.string());
const secondaryAction = optionalRender(z.string());
const footerNote = optionalRichTextRender();

export const ctaSpec = block({
  slug: 'cta',
  blockType: 'cta',
  aiDraftable: true,
  labels: { singular: 'Appel à l’action', plural: 'Appels à l’action' },
  imageURL: '/block-previews/cta.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre principal centré (ex. "Merci", "Et maintenant ?")'),
    rawField('subtitle', subtitle, optionalAi(z.string()), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Phrase d’accroche sous le titre',
    }),
    rawField('primaryAction', primaryAction, optionalAi(z.string()), {
      type: 'text',
      label: 'Action principale',
      description: 'Texte du bouton principal (optionnel)',
    }),
    rawField('secondaryAction', secondaryAction, optionalAi(z.string()), {
      type: 'text',
      label: 'Action secondaire',
      description: 'Texte du lien secondaire (optionnel)',
    }),
    rawField('footerNote', footerNote, optionalAi(z.string()), {
      type: 'richText',
      label: 'Note de bas',
      description: 'Texte en bas de la diapositive (optionnel)',
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 8,
    heading: 'cta',
    summary: 'Diapositive centrée pour appel à l\'action OU clôture (merci, contact, etc.)',
    lines: [
      'eyebrow, title (obligatoire), subtitle',
      'primaryAction / secondaryAction: libellés de boutons',
      'footerNote: petit texte en bas',
    ],
  },
});

export const ctaRenderSchema = z.object({
  blockType: z.literal('cta'),
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  footerNote,
});

export type CtaBlockData = InferRender<typeof ctaRenderSchema>;
