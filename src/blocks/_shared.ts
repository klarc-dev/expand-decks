import type { Field } from 'payload';
import {
  BoldFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';

import { COLLECTIONS } from '../lib/collections';
import { VarMentionFeature } from './features/varMention.server';
import { validateSerializedTextLength } from './spec/limitValidation';
import { SLIDE_LIMITS } from './spec/limits';

// Shared minimal inline editor for all rich-text slide fields: paragraphs +
// bold/italic/underline/link/lists + a floating toolbar + the `@` variable
// mention menu. No headings, uploads, relationships or blocks — slide body
// copy, not documents.
export const slideRichTextEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    LinkFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    InlineToolbarFeature(),
    VarMentionFeature(),
  ],
});

export const previewField: Field = {
  name: 'preview',
  type: 'ui',
  admin: { components: { Field: '/components/SlidePreview#default' } },
};

export const eyebrowField = (
  description = 'Texte court au-dessus du titre',
  maxLength?: number,
): Field => ({
  name: 'eyebrow',
  type: 'text',
  label: 'Accroche',
  admin: { description },
  maxLength,
});

export const titleField = (
  description = 'Titre principal de la diapositive',
  maxLength?: number,
): Field => ({
  name: 'title',
  type: 'text',
  required: true,
  label: 'Titre',
  admin: { description },
  maxLength,
});

export const cardTitleDescFields = (limits?: {
  titleMaxLength?: number;
  descriptionMaxLength?: number;
}): Field[] => [
  {
    name: 'title',
    type: 'text',
    required: true,
    label: 'Titre',
    admin: { description: 'Titre de la carte' },
    maxLength: limits?.titleMaxLength,
  },
  {
    name: 'description',
    type: 'richText',
    editor: slideRichTextEditor,
    label: 'Description',
    admin: { description: 'Contenu descriptif de la carte' },
    validate: limits?.descriptionMaxLength
      ? (value: unknown) => validateSerializedTextLength(value, limits.descriptionMaxLength!)
      : undefined,
  },
];

// Shared "Sources / Notes" repeater appended to every layout block (except
// markdown) by the L1 emitter. Each note renders as a numbered ¹²³ entry in the
// slide-bottom footnote band (consumeDefFooter), in author order. No magic
// `{{def:…}}` syntax required — clicking "Ajouter une note" is the discoverable
// path. The single `text` subfield accepts inline markdown links/emphasis
// (e.g. `[texte](https://…)`) via md() at render time.
export const footnotesField = (): Field => ({
  name: 'footnotes',
  type: 'array',
  label: 'Sources / Notes',
  labels: { singular: 'Note', plural: 'Notes' },
  admin: {
    description:
      'Notes numérotées affichées en bas de diapositive (ex. « Source : … »). Lien possible : [texte](https://…).',
    components: { RowLabel: '/components/RepeaterRowLabel#default' },
  },
  minRows: SLIDE_LIMITS.common.footnotes.min,
  maxRows: SLIDE_LIMITS.common.footnotes.max,
  fields: [
    {
      name: 'text',
      type: 'text',
      required: true,
      label: 'Texte',
      maxLength: SLIDE_LIMITS.common.footnotes.text.max,
    },
  ],
});

export const imageFields = (
  description = 'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)',
): Field[] => [
  {
    name: 'image',
    type: 'upload',
    relationTo: COLLECTIONS.media,
    label: 'Image',
    admin: { description },
  },
  {
    name: 'imagePosition',
    type: 'select',
    label: 'Position de l’image',
    defaultValue: 'right',
    admin: {
      description: 'Côté où l’image s’affiche quand une image est renseignée',
      condition: (_, siblingData) => Boolean(siblingData?.image),
    },
    options: [
      { label: 'Droite', value: 'right' },
      { label: 'Gauche', value: 'left' },
    ],
  },
];
