import type { Block } from 'payload';

import { imageFields, previewField, surfaceField } from './_shared';

export const SectionBlock: Block = {
  slug: 'section',
  labels: { singular: 'Section', plural: 'Sections' },
  imageURL: '/block-previews/section.svg',
  fields: [
    {
      name: 'number',
      type: 'text',
      label: 'Numéro',
      admin: { description: 'Numéro de section affiché (ex. "02")' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre de la section' },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Sous-titre',
      admin: { description: 'Description complémentaire sous le titre' },
    },
    surfaceField(),
    ...imageFields(),
    previewField,
  ],
};
