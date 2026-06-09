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
  surfaceFieldSpec,
  titleFieldSpec,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
// subtitle + footers are rich text (Lexical); their render Zod is the editor
// state, while their AI Zod stays a markdown string (converted to Lexical on write).
const subtitle = optionalRichTextRender();
const footerLeft = optionalRichTextRender();
const footerRight = optionalRichTextRender();
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
    eyebrowFieldSpec(eyebrow, 'Texte court au-dessus du titre principal'),
    titleFieldSpec(title, 'Titre principal de la diapositive de couverture'),
    rawField('subtitle', subtitle, optionalAi(z.string()), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Paragraphe descriptif sous le titre',
    }),
    rawField('footerLeft', footerLeft, optionalAi(z.string()), {
      type: 'richText',
      label: 'Pied de page gauche',
      description: 'Texte en bas à gauche (ex. lien ou action)',
    }),
    rawField('footerRight', footerRight, optionalAi(z.string()), {
      type: 'richText',
      label: 'Pied de page droit',
      description: 'Texte en bas à droite (ex. date ou note)',
    }),
    surfaceFieldSpec(surface, true),
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
