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
const intro = optionalRichTextRender();
const leftFooter = optionalRichTextRender();
const rightCards = optionalRender(
  z.array(
    z.object({
      title: z.string(),
      description: optionalRichTextRender(),
    }),
  ),
);
const image = optionalRender(z.object({ url: z.string() }));
const imagePosition = optionalRender(z.enum(['right', 'left']));

export const twoColsSpec = block({
  slug: 'twoCols',
  blockType: 'twoCols',
  aiDraftable: true,
  labels: { singular: 'Deux colonnes', plural: 'Deux colonnes' },
  imageURL: '/block-previews/twoCols.svg',
  fields: [
    eyebrowFieldSpec(eyebrow, 'Texte court au-dessus du titre (ex. "01 · Conseil financier")'),
    titleFieldSpec(title, 'Titre principal de la diapositive'),
    rawField('intro', intro, optionalAi(z.string()), {
      type: 'richText',
      label: 'Introduction',
      description: 'Paragraphe d’introduction dans la colonne gauche',
    }),
    rawField('leftFooter', leftFooter, optionalAi(z.string()), {
      type: 'richText',
      label: 'Pied gauche',
      description: 'Texte ou statistique en bas de la colonne gauche',
    }),
    rawField(
      'rightCards',
      z.array(z.unknown()),
      optionalAi(
        z.array(
          z.object({
            title: z.string(),
            description: optionalAi(z.string()),
          }),
        ),
      ),
      {
        type: 'array',
        label: 'Cartes (colonne droite)',
        description: 'Liste de cartes affichées dans la colonne droite',
        fields: [factoryField('cardTitleDesc', 'cardTitleDesc', z.unknown(), false)],
      },
    ),
    factoryField('image', 'image', z.never(), false, {
      description:
        'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left). Remplace les rightCards si renseignée.',
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 4,
    heading: 'twoCols',
    summary: 'Deux colonnes avec cartes à droite',
    lines: [
      'eyebrow, title (obligatoire), intro, leftFooter',
      'rightCards: [{title, description}]',
    ],
  },
});

export const twoColsRenderSchema = z.object({
  blockType: z.literal('twoCols'),
  eyebrow,
  title,
  intro,
  leftFooter,
  rightCards,
  image,
  imagePosition,
});

export type TwoColsBlockData = InferRender<typeof twoColsRenderSchema>;
