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

// Shared minimal inline editor for all rich-text slide fields: paragraphs +
// bold/italic/underline/link/lists + a floating toolbar. No headings, uploads,
// relationships or blocks — slide body copy, not documents.
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
  ],
});

export const previewField: Field = {
  name: 'preview',
  type: 'ui',
  admin: { components: { Field: '/components/SlidePreview#default' } },
};

export const eyebrowField = (description = 'Texte court au-dessus du titre'): Field => ({
  name: 'eyebrow',
  type: 'text',
  label: 'Accroche',
  admin: { description },
});

export const titleField = (description: string): Field => ({
  name: 'title',
  type: 'text',
  required: true,
  label: 'Titre',
  admin: { description },
});

export const cardTitleDescFields = (): Field[] => [
  {
    name: 'title',
    type: 'text',
    required: true,
    label: 'Titre',
    admin: { description: 'Titre de la carte' },
  },
  {
    name: 'description',
    type: 'richText',
    editor: slideRichTextEditor,
    label: 'Description',
    admin: { description: 'Contenu descriptif de la carte' },
  },
];

export const surfaceField = (opts?: { gradient?: boolean }): Field => ({
  name: 'surface',
  type: 'select',
  label: 'Surface',
  defaultValue: 'dark',
  admin: { description: 'Apparence de fond de la diapositive' },
  options: [
    { label: 'Sombre', value: 'dark' },
    { label: 'Clair', value: 'light' },
    ...(opts?.gradient ? [{ label: 'Dégradé', value: 'gradient' }] : []),
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
