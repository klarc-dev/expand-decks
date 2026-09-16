import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedString,
  limitedTextPayload,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalLimitedRichTextRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const subtitle = optionalLimitedRichTextRender(SLIDE_LIMITS.cta.subtitle);
const primaryAction = optionalLimitedRender(SLIDE_LIMITS.cta.action);
// Button targets: https, mailto: or tel:. Rendered as <a href> so the exported
// PDF carries a clickable annotation; a button without URL stays a plain pill.
const primaryActionUrl = optionalLimitedRender(SLIDE_LIMITS.cta.actionUrl);
const footerNote = optionalLimitedRichTextRender(SLIDE_LIMITS.cta.footerNote);

export const ctaSpec = block({
  slug: 'cta',
  blockType: 'cta',
  aiDraftable: true,
  labels: { singular: 'Appel à l’action', plural: 'Appels à l’action' },
  imageURL: '/block-previews/cta.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre principal centré (ex. "Merci", "Et maintenant ?")'),
    rawField('subtitle', subtitle, optionalLimitedAi(SLIDE_LIMITS.cta.subtitle), {
      type: 'richText',
      label: 'Sous-titre',
      description: 'Phrase d’accroche sous le titre',
      maxLength: SLIDE_LIMITS.cta.subtitle.max,
    }),
    rawField(
      'primaryAction',
      primaryAction,
      optionalLimitedAi(SLIDE_LIMITS.cta.action),
      limitedTextPayload(SLIDE_LIMITS.cta.action, {
        type: 'text',
        label: 'Action principale',
        description: 'Texte de l’unique bouton (optionnel)',
      }),
    ),
    rawField(
      'primaryActionUrl',
      primaryActionUrl,
      optionalLimitedAi(SLIDE_LIMITS.cta.actionUrl),
      limitedTextPayload(SLIDE_LIMITS.cta.actionUrl, {
        type: 'text',
        label: 'Lien de l’action principale',
        description:
          'URL https, mailto: ou tel: ; rend le bouton cliquable dans le PDF (ex. {org.bookingUrl})',
      }),
    ),
    rawField('footerNote', footerNote, optionalLimitedAi(SLIDE_LIMITS.cta.footerNote), {
      type: 'richText',
      label: 'Note de bas',
      description: 'Texte en bas de la diapositive (optionnel)',
      maxLength: SLIDE_LIMITS.cta.footerNote.max,
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 8,
    heading: 'cta',
    summary: "Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)",
    lines: [
      'eyebrow, title (obligatoire), subtitle',
      'primaryAction: libellé de l’unique bouton (optionnel)',
      'primaryActionUrl: cible du bouton (https, mailto: ou tel:), uniquement une coordonnée fournie dans le contexte ou le brief, jamais inventée',
      'footerNote: petit texte en bas',
    ],
  },
});

export const ctaRenderSchema = z.object({
  blockType: z.literal('cta'),
  eyebrow,
  title,
  subtitle,
  primaryAction,
  primaryActionUrl,
  footerNote,
});

export type CtaBlockData = InferRender<typeof ctaRenderSchema>;
