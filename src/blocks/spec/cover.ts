import { z } from 'zod';

import {
  block,
  limitedArray,
  limitedArrayPayload,
  limitedTextPayload,
  nonBlankLimitedString,
  optionalAi,
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
import { PILL_VARIANTS, PILL_VARIANT_OPTIONS } from './pillVariants';

import { intervenantsFieldSpec, intervenantsRender } from './person';

const pillVariant = optionalRender(z.enum(PILL_VARIANTS));

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const pillText = nonBlankLimitedString(SLIDE_LIMITS.cover.pills.text);
const pillRows = limitedArray(z.object({ text: pillText }), SLIDE_LIMITS.cover.pills);
const pills = optionalRender(pillRows);
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
    rawField(
      'pills',
      pills,
      optionalAi(pillRows),
      limitedArrayPayload(SLIDE_LIMITS.cover.pills, {
        type: 'array',
        label: 'Pastilles',
        labels: { singular: 'Pastille', plural: 'Pastilles' },
        description: 'Libellés indépendants au-dessus du titre. Une ligne par pastille.',
        fields: [
          rawField(
            'text',
            pillText,
            pillText,
            limitedTextPayload(SLIDE_LIMITS.cover.pills.text, {
              type: 'text',
              label: 'Texte',
              required: true,
              validate: (value: unknown) =>
                pillText.safeParse(value).success ||
                `Renseigner un texte non vide de ${SLIDE_LIMITS.cover.pills.text.max} caractères maximum`,
            }),
          ),
        ],
      }),
    ),
    rawField('pillVariant', pillVariant, optionalAi(z.enum(PILL_VARIANTS)), {
      type: 'select',
      label: 'Couleur des pastilles',
      description: 'Rôle de la palette de l’organisation, commun à toutes les pastilles.',
      options: PILL_VARIANT_OPTIONS,
      defaultValue: 'default',
    }),
    // Keep the saved column and an editable fallback: legacy covers remain intact.
    rawField('eyebrow', eyebrow, false, {
      type: 'text',
      label: 'Ancienne pastille',
      description:
        'Affichée uniquement si aucune pastille n’est renseignée. Effacer pour ne rien afficher.',
      maxLength: SLIDE_LIMITS.common.eyebrow.max,
    }),
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
      'pills: [{text}] — libellés courts indépendants au-dessus du titre, une entrée par pastille',
      `pillVariant: ${PILL_VARIANTS.join(' | ')} — rôle de couleur commun aux pastilles`,
      'title: titre principal (obligatoire)',
      'subtitle: paragraphe descriptif',
    ],
  },
});

export const coverRenderSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow,
  pills,
  pillVariant,
  title,
  subtitle,
  intervenants,
  image,
  imagePosition,
});

export type CoverBlockData = InferRender<typeof coverRenderSchema>;
