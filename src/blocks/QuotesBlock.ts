import type { Block } from 'payload';

import { eyebrowField, previewField, titleField } from './_shared';

export const QuotesBlock: Block = {
  slug: 'quotes',
  labels: { singular: 'Citations', plural: 'Citations' },
  imageURL: '/block-previews/quotes.svg',
  fields: [
    eyebrowField(),
    titleField('Titre de la diapositive'),
    {
      name: 'quotes',
      type: 'array',
      label: 'Citations',
      admin: { description: 'Liste des citations à afficher en grille' },
      fields: [
        {
          name: 'quote',
          type: 'text',
          required: true,
          label: 'Citation',
          admin: { description: 'Texte de la citation' },
        },
        {
          name: 'authorName',
          type: 'text',
          required: true,
          label: 'Auteur',
          admin: { description: 'Nom de l’auteur cité' },
        },
        {
          name: 'authorRole',
          type: 'text',
          label: 'Rôle de l’auteur',
          admin: { description: 'Fonction ou contexte (optionnel)' },
        },
      ],
    },
    previewField,
  ],
};
