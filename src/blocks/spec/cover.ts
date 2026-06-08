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
const subtitle = optionalRender(z.string());
const footerLeft = optionalRender(z.string());
const footerRight = optionalRender(z.string());
const surface = optionalRender(z.enum(['dark', 'light', 'gradient']));
const image = optionalRender(z.object({ url: z.string() }));
const imagePosition = optionalRender(z.enum(['right', 'left']));

export const coverSpec = block({
  slug: 'cover',
  blockType: 'cover',
  aiDraftable: true,
  labels: { singular: 'Couverture', plural: 'Couvertures' },
  imageURL: '/block-previews/cover.svg',
  fields: [
    factoryField('eyebrow', 'eyebrow', eyebrow, optionalAi(z.string()), {
      description: 'Texte court au-dessus du titre principal',
    }),
    factoryField('title', 'title', title, z.string(), {
      description: 'Titre principal de la diapositive de couverture',
    }),
    rawField('subtitle', subtitle, optionalAi(z.string()), {
      type: 'textarea',
      label: 'Sous-titre',
      description: 'Paragraphe descriptif sous le titre',
    }),
    rawField('footerLeft', footerLeft, optionalAi(z.string()), {
      type: 'text',
      label: 'Pied de page gauche',
      description: 'Texte en bas à gauche (ex. lien ou action)',
    }),
    rawField('footerRight', footerRight, optionalAi(z.string()), {
      type: 'text',
      label: 'Pied de page droit',
      description: 'Texte en bas à droite (ex. date ou note)',
    }),
    factoryField('surface', 'surface', surface, optionalAi(z.enum(['dark', 'light', 'gradient'])), {
      gradient: true,
    }),
    factoryField('image', 'image', z.never(), false),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 1,
    heading: 'cover',
    summary: "Diapositive d'ouverture",
    lines: [
      'eyebrow: accroche courte au-dessus du titre',
      'title: titre principal (obligatoire)',
      'subtitle: paragraphe descriptif',
      'footerLeft / footerRight: textes en bas de slide',
      'surface: "dark" | "light" | "gradient"',
    ],
  },
});

export const coverRenderSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow,
  title,
  subtitle,
  footerLeft,
  footerRight,
  surface,
  image,
  imagePosition,
});

export type CoverBlockData = InferRender<typeof coverRenderSchema>;
