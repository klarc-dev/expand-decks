import { z } from 'zod';

import {
  block,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  optionalRichTextRender,
  rawField,
} from './dsl';

const number = optionalRender(z.string());
const title = z.string();
const subtitle = optionalRichTextRender();
const surface = optionalRender(z.enum(['dark', 'light']));
const image = optionalRender(z.object({ url: z.string() }));
const imagePosition = optionalRender(z.enum(['right', 'left']));

export const sectionSpec = block({
  slug: 'section',
  blockType: 'section',
  aiDraftable: true,
  labels: { singular: 'Section', plural: 'Sections' },
  imageURL: '/block-previews/section.svg',
  fields: [
    rawField('number', number, optionalAi(z.string()), {
      type: 'text',
      label: 'Numéro',
      description: 'Numéro de section affiché (ex. "02")',
    }),
    factoryField('title', 'title', title, z.string(), {
      description: 'Titre de la section',
    }),
    rawField('subtitle', subtitle, optionalAi(z.string()), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Description complémentaire sous le titre',
    }),
    factoryField('surface', 'surface', surface, optionalAi(z.enum(['dark', 'light']))),
    factoryField('image', 'image', z.never(), false),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 2,
    heading: 'section',
    summary: 'Intercalaire de section',
    lines: [
      'number: numéro (ex. "01")',
      'title: titre (obligatoire)',
      'subtitle: description',
      'surface: "dark" | "light"',
    ],
  },
});

export const sectionRenderSchema = z.object({
  blockType: z.literal('section'),
  number,
  title,
  subtitle,
  surface,
  image,
  imagePosition,
});

export type SectionBlockData = InferRender<typeof sectionRenderSchema>;
