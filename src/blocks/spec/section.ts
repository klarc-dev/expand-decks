import { z } from 'zod';

import {
  block,
  factoryField,
  type InferRender,
  limitedString,
  limitedTextPayload,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalLimitedRichTextRender,
  optionalRender,
  optionalUnknownRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const number = optionalLimitedRender(SLIDE_LIMITS.section.number);
const title = limitedString(SLIDE_LIMITS.common.title);
const subtitle = optionalLimitedRichTextRender(SLIDE_LIMITS.section.subtitle);
const image = optionalRender(z.object({ url: z.string() }));
const imagePosition = optionalRender(z.enum(['right', 'left']));

export const sectionSpec = block({
  slug: 'section',
  blockType: 'section',
  aiDraftable: true,
  labels: { singular: 'Section', plural: 'Sections' },
  imageURL: '/block-previews/section.svg',
  fields: [
    rawField(
      'number',
      number,
      optionalLimitedAi(SLIDE_LIMITS.section.number),
      limitedTextPayload(SLIDE_LIMITS.section.number, {
        type: 'text',
        label: 'Numéro',
        description: 'Numéro de section affiché (ex. "02")',
      }),
    ),
    titleFieldSpec(title, 'Titre de la section'),
    rawField('subtitle', subtitle, optionalLimitedAi(SLIDE_LIMITS.section.subtitle), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Description complémentaire sous le titre',
      maxLength: SLIDE_LIMITS.section.subtitle.max,
    }),
    factoryField('image', 'image', optionalUnknownRender(), false),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 2,
    heading: 'section',
    summary: 'Intercalaire de section',
    lines: ['number: numéro (ex. "01")', 'title: titre (obligatoire)', 'subtitle: description'],
  },
});

export const sectionRenderSchema = z.object({
  blockType: z.literal('section'),
  number,
  title,
  subtitle,
  image,
  imagePosition,
});

export type SectionBlockData = InferRender<typeof sectionRenderSchema>;
