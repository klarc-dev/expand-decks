import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedArray,
  limitedArrayPayload,
  limitedString,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalLimitedRichTextRender,
  optionalRender,
  optionalUnknownRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
// subtitle is rich text (Lexical); its render Zod is the editor state, while
// its AI Zod stays a markdown string (converted to Lexical on write).
const subtitle = optionalLimitedRichTextRender(SLIDE_LIMITS.cover.subtitle);
const image = optionalRender(z.object({ url: z.string() }));
const imagePosition = optionalRender(z.enum(['right', 'left']));
const mediaRelationship = z.union([
  z.string(),
  z.number(),
  z
    .object({
      id: z.union([z.string(), z.number()]),
      url: optionalRender(z.string()),
      thumbnailURL: optionalRender(z.string()),
      sizes: optionalRender(
        z.object({
          thumbnail: optionalRender(z.object({ url: optionalRender(z.string()) }).passthrough()),
          card: optionalRender(z.object({ url: optionalRender(z.string()) }).passthrough()),
        }),
      ),
    })
    .passthrough(),
]);
const userRelationship = z.union([
  z.string(),
  z.number(),
  z
    .object({
      id: z.union([z.string(), z.number()]),
      name: optionalRender(z.string()),
      email: optionalRender(z.string()),
      title: optionalRender(z.string()),
      avatar: optionalRender(mediaRelationship),
    })
    .passthrough(),
]);
const intervenants = optionalRender(
  limitedArray(
    z
      .object({
        user: userRelationship.nullable().optional(),
      })
      .passthrough(),
    SLIDE_LIMITS.cover.speakers,
  ),
);

export const coverSpec = block({
  slug: 'cover',
  blockType: 'cover',
  aiDraftable: true,
  labels: { singular: 'Couverture', plural: 'Couvertures' },
  imageURL: '/block-previews/cover.svg',
  fields: [
    eyebrowFieldSpec(eyebrow, 'Texte court au-dessus du titre principal'),
    titleFieldSpec(title, 'Titre principal de la diapositive de couverture'),
    rawField('subtitle', subtitle, optionalLimitedAi(SLIDE_LIMITS.cover.subtitle), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Paragraphe descriptif sous le titre',
      maxLength: SLIDE_LIMITS.cover.subtitle.max,
    }),
    rawField(
      'intervenants',
      intervenants,
      false,
      limitedArrayPayload(SLIDE_LIMITS.cover.speakers, {
        type: 'array',
        label: 'Intervenants',
        description: 'Personnes affichées sur la diapositive de couverture',
        fields: [
          rawField('user', userRelationship, false, {
            type: 'relationship',
            relationTo: 'users',
            required: true,
            maxDepth: 2,
            label: 'Utilisateur',
            description: 'Utilisateur affiché comme intervenant',
          }),
        ],
      }),
    ),
    factoryField('image', 'image', optionalUnknownRender(), false),
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
    ],
  },
});

export const coverRenderSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow,
  title,
  subtitle,
  intervenants,
  image,
  imagePosition,
});

export type CoverBlockData = InferRender<typeof coverRenderSchema>;
