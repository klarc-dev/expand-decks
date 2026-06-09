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
const sidebarText = optionalRichTextRender();
const columns = optionalRender(z.enum(['2', '3', '4']));
const cards = optionalRender(
  z.array(
    z.object({
      number: optionalRender(z.string()),
      title: z.string(),
      description: optionalRichTextRender(),
    }),
  ),
);

export const cardGridSpec = block({
  slug: 'cardGrid',
  blockType: 'cardGrid',
  aiDraftable: true,
  labels: { singular: 'Grille de cartes', plural: 'Grilles de cartes' },
  imageURL: '/block-previews/cardGrid.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre principal de la grille'),
    rawField('sidebarText', sidebarText, optionalAi(z.string()), {
      type: 'richText',
      label: 'Texte latéral',
      description: 'Texte optionnel affiché sur le côté de la grille',
    }),
    rawField('columns', columns, optionalAi(z.enum(['2', '3', '4'])), {
      type: 'select',
      label: 'Colonnes',
      defaultValue: '4',
      description: 'Nombre de colonnes dans la grille',
      options: [
        { label: '2 colonnes', value: '2' },
        { label: '3 colonnes', value: '3' },
        { label: '4 colonnes', value: '4' },
      ],
    }),
    rawField(
      'cards',
      z.array(z.unknown()),
      optionalAi(
        z.array(
          z.object({
            number: optionalAi(z.string()),
            title: z.string(),
            description: optionalAi(z.string()),
          }),
        ),
      ),
      {
        type: 'array',
        label: 'Cartes',
        description: 'Liste des cartes à afficher dans la grille',
        fields: [
          rawField('number', optionalRender(z.string()), optionalAi(z.string()), {
            type: 'text',
            label: 'Numéro',
            description: 'Numéro ou identifiant de la carte (ex. "01")',
          }),
          factoryField('cardTitleDesc', 'cardTitleDesc', z.unknown(), false),
        ],
      },
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 5,
    heading: 'cardGrid',
    summary: 'Grille de cartes numérotées',
    lines: [
      'eyebrow, title (obligatoire), sidebarText',
      'columns: "2" | "3" | "4"',
      'cards: [{number, title, description}]',
    ],
  },
});

export const cardGridRenderSchema = z.object({
  blockType: z.literal('cardGrid'),
  eyebrow,
  title,
  sidebarText,
  columns,
  cards,
});

export type CardGridBlockData = InferRender<typeof cardGridRenderSchema>;
