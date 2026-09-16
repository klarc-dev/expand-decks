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
  // `[mot]` renders as the rose heading mark (see md() / .k-mark).
  admin: {
    description: `${description} · Entourez un terme de crochets pour le mettre en valeur : [Klarc]`,
  },
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

export const imageField = (
  description = 'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)',
): Field =>
  ({
    name: 'image',
    type: 'upload',
    relationTo: COLLECTIONS.media,
    label: 'Image',
    admin: { description },
  }) as Field;
