import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  leadFieldSpec,
  leadRender,
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
  optionalUnknownRender,
  rawField,
  titleFieldSpec,
  type InferRender,
} from './dsl';
import { SLIDE_LIMITS } from './limits';
import { userRelationship } from './person';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const intro = optionalLimitedRichTextRender(SLIDE_LIMITS.twoCols.intro);
const leftFooter = optionalLimitedRichTextRender(SLIDE_LIMITS.twoCols.leftFooter);
const rightCards = optionalRender(
  limitedArray(
    z.object({
      title: limitedString(SLIDE_LIMITS.twoCols.cardTitle),
      description: optionalLimitedRichTextRender(SLIDE_LIMITS.twoCols.cardDescription),
    }),
    SLIDE_LIMITS.twoCols.cards,
  ),
);
const image = optionalRender(z.object({ url: z.string() }));
const imagePosition = optionalRender(z.enum(['right', 'left']));
const leftUser = optionalRender(userRelationship);
const leftUserHeading = optionalLimitedRender(SLIDE_LIMITS.twoCols.leftUserHeading);
const leftUserDescription = optionalLimitedRender(SLIDE_LIMITS.twoCols.leftUserDescription);

export const twoColsSpec = block({
  slug: 'twoCols',
  blockType: 'twoCols',
  aiDraftable: true,
  labels: { singular: 'Deux colonnes', plural: 'Deux colonnes' },
  imageURL: '/block-previews/twoCols.svg',
  fields: [
    eyebrowFieldSpec(eyebrow, 'Texte court au-dessus du titre (ex. "01 · Conseil financier")'),
    titleFieldSpec(title, 'Titre principal de la diapositive'),
    leadFieldSpec(),
    rawField(
      'intro',
      intro,
      optionalLimitedAi(SLIDE_LIMITS.twoCols.intro),
      limitedTextPayload(SLIDE_LIMITS.twoCols.intro, {
        type: 'richText',
        label: 'Introduction',
        description: 'Paragraphe d’introduction dans la colonne gauche',
      }),
    ),
    rawField(
      'leftFooter',
      leftFooter,
      optionalLimitedAi(SLIDE_LIMITS.twoCols.leftFooter),
      limitedTextPayload(SLIDE_LIMITS.twoCols.leftFooter, {
        type: 'richText',
        label: 'Pied gauche',
        description: 'Texte ou statistique en bas de la colonne gauche',
      }),
    ),
    rawField(
      'leftUserHeading',
      leftUserHeading,
      false,
      limitedTextPayload(SLIDE_LIMITS.twoCols.leftUserHeading, {
        type: 'text',
        label: 'Titre au-dessus de la carte utilisateur',
        description: 'Titre optionnel affiché immédiatement au-dessus de la carte utilisateur',
      }),
    ),
    rawField('leftUser', leftUser, false, {
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 2,
      label: 'Carte utilisateur (colonne gauche)',
      description:
        'Utilisateur affiché dans la colonne gauche avec la même carte que sur la diapositive Contacts',
    }),
    rawField(
      'leftUserDescription',
      leftUserDescription,
      false,
      limitedTextPayload(SLIDE_LIMITS.twoCols.leftUserDescription, {
        type: 'text',
        label: 'Expertise (carte utilisateur)',
        description:
          'Expertise ou sujets suivis, affichés sous la fonction, comme sur la diapositive Contacts',
      }),
    ),
    rawField(
      'rightCards',
      rightCards,
      limitedArray(
        z.object({
          title: nonBlankLimitedString(SLIDE_LIMITS.twoCols.cardTitle),
          description: optionalLimitedAi(SLIDE_LIMITS.twoCols.cardDescription),
        }),
        SLIDE_LIMITS.twoCols.cards,
      ),
      limitedArrayPayload(SLIDE_LIMITS.twoCols.cards, {
        type: 'array',
        label: 'Cartes (colonne droite)',
        description: 'Liste de cartes affichées dans la colonne droite',
        fields: [
          factoryField('cardTitleDesc', 'cardTitleDesc', z.unknown(), false, {
            titleMaxLength: SLIDE_LIMITS.twoCols.cardTitle.max,
            descriptionMaxLength: SLIDE_LIMITS.twoCols.cardDescription.max,
          }),
        ],
      }),
    ),
    factoryField('image', 'image', optionalUnknownRender(), false, {
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
      'eyebrow, title (obligatoire), lead, intro, leftFooter',
      'rightCards: [{title, description}]',
    ],
  },
});

export const twoColsRenderSchema = z.object({
  blockType: z.literal('twoCols'),
  eyebrow,
  title,
  lead: leadRender(),
  intro,
  leftFooter,
  leftUserHeading,
  leftUser,
  leftUserDescription,
  rightCards,
  image,
  imagePosition,
});

export type TwoColsBlockData = InferRender<typeof twoColsRenderSchema>;
