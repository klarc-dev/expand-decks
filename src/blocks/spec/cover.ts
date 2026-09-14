import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
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
import { intervenantsFieldSpec, intervenantsRender } from './person';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
// subtitle is rich text (Lexical); its render Zod is the editor state, while
// its AI Zod stays a markdown string (converted to Lexical on write).
const subtitle = optionalLimitedRichTextRender(SLIDE_LIMITS.cover.subtitle);
const image = optionalRender(
  z.object({ url: z.string(), filename: optionalRender(z.string()) }).passthrough(),
);
const imagePosition = optionalRender(z.enum(['right', 'left']));
const intervenants = intervenantsRender(SLIDE_LIMITS.cover.speakers);

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
    intervenantsFieldSpec(
      SLIDE_LIMITS.cover.speakers,
      'Personnes affichées sur la diapositive de couverture',
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
