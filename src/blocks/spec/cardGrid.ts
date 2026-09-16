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
  optionalAi,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalLimitedRichTextRender,
  optionalRender,
  rawField,
  sharedRenderFields,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';
import { intervenantsFieldSpec, intervenantsRender } from './person';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const sidebarText = optionalLimitedRichTextRender(SLIDE_LIMITS.cardGrid.sidebar);
const columns = optionalRender(z.enum(['2', '3', '4']));
const intervenants = intervenantsRender(SLIDE_LIMITS.cardGrid.intervenants);
// Payload persists an untouched array field as [] — for rendering that is the
// same as "no cards" (e.g. a contacts slide that only carries intervenants),
// so normalize before the min-2 card rule applies to authored grids.
const cards = z.preprocess(
  (value) => (Array.isArray(value) && value.length === 0 ? null : value),
  optionalRender(
    limitedArray(
      z.object({
        number: optionalLimitedRender(SLIDE_LIMITS.cardGrid.cardNumber),
        title: limitedString(SLIDE_LIMITS.cardGrid.cardTitle),
        description: optionalLimitedRichTextRender(SLIDE_LIMITS.cardGrid.cardDescription),
      }),
      SLIDE_LIMITS.cardGrid.cards,
    ),
  ),
);

export const cardGridSpec = block({
  slug: 'cardGrid',
  blockType: 'cardGrid',
  aiDraftable: true,
  footnotes: true,
  labels: { singular: 'Grille de cartes', plural: 'Grilles de cartes' },
  imageURL: '/block-previews/cardGrid.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre principal de la grille'),
    rawField('sidebarText', sidebarText, optionalLimitedAi(SLIDE_LIMITS.cardGrid.sidebar), {
      type: 'richText',
      label: 'Description',
      description: 'Phrase d’introduction affichée sous le titre, dans l’en-tête commun',
      maxLength: SLIDE_LIMITS.cardGrid.sidebar.max,
    }),
    rawField('columns', columns, optionalAi(z.enum(['2', '3', '4'])), {
      type: 'select',
      label: 'Colonnes',
      defaultValue: '4',
      description: 'Nombre maximal de colonnes dans la grille',
      options: [
        { label: '2 colonnes', value: '2' },
        { label: '3 colonnes', value: '3' },
        { label: '4 colonnes', value: '4' },
      ],
    }),
    rawField(
      'cards',
      cards,
      limitedArray(
        z.object({
          number: optionalLimitedAi(SLIDE_LIMITS.cardGrid.cardNumber),
          title: nonBlankLimitedString(SLIDE_LIMITS.cardGrid.cardTitle),
          description: optionalLimitedAi(SLIDE_LIMITS.cardGrid.cardDescription),
        }),
        SLIDE_LIMITS.cardGrid.cards,
      ),
      limitedArrayPayload(SLIDE_LIMITS.cardGrid.cards, {
        type: 'array',
        label: 'Cartes',
        description: 'Liste des cartes à afficher dans la grille',
        fields: [
          rawField(
            'number',
            optionalLimitedRender(SLIDE_LIMITS.cardGrid.cardNumber),
            optionalLimitedAi(SLIDE_LIMITS.cardGrid.cardNumber),
            limitedTextPayload(SLIDE_LIMITS.cardGrid.cardNumber, {
              type: 'text',
              label: 'Numéro',
              description: 'Numéro ou identifiant de la carte (ex. "01")',
            }),
          ),
          factoryField('cardTitleDesc', 'cardTitleDesc', z.unknown(), false, {
            titleMaxLength: SLIDE_LIMITS.cardGrid.cardTitle.max,
            descriptionMaxLength: SLIDE_LIMITS.cardGrid.cardDescription.max,
          }),
        ],
      }),
    ),
    intervenantsFieldSpec(
      SLIDE_LIMITS.cardGrid.intervenants,
      'Personnes affichées en bandeau discret sous la grille',
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

const cardGridRenderSchema = z.object({
  blockType: z.literal('cardGrid'),
  eyebrow,
  title,
  sidebarText,
  columns,
  cards,
  intervenants,
  ...sharedRenderFields(true),
});

export type CardGridBlockData = InferRender<typeof cardGridRenderSchema>;
