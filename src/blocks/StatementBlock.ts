import type { Block } from 'payload';

import { eyebrowField, previewField } from './_shared';

export const StatementBlock: Block = {
  slug: 'statement',
  labels: { singular: 'Affirmation', plural: 'Affirmations' },
  imageURL: '/block-previews/statement.svg',
  fields: [
    eyebrowField(),
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Citation ou affirmation principale' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Corps',
      admin: { description: 'Texte développant l’affirmation' },
    },
    {
      name: 'footer',
      type: 'text',
      label: 'Pied de page',
      admin: { description: 'Légende ou note en bas de la diapositive' },
    },
    previewField,
  ],
};
