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
// subtitle is rich text (Lexical); its render Zod is the editor state, while
// its AI Zod stays a markdown string (converted to Lexical on write).
const subtitle = optionalRichTextRender();
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
  z.array(
    z
      .object({
        user: userRelationship.nullable().optional(),
      })
      .passthrough(),
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
    rawField('subtitle', subtitle, optionalAi(z.string()), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Paragraphe descriptif sous le titre',
    }),
    rawField('intervenants', intervenants, false, {
      type: 'array',
      label: 'Intervenants',
      description: 'Personnes affichées sur la diapositive de couverture',
      maxRows: 4,
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
      'intervenants: personnes affichées en cartes avatar (sélection manuelle)',
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
