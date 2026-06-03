import type { Block } from 'payload';

export const QuotesBlock: Block = {
  slug: 'quotes',
  labels: { singular: 'Citations', plural: 'Citations' },
  imageURL: '/block-previews/quotes.svg',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Accroche',
      admin: { description: 'Texte court au-dessus du titre' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre de la diapositive' },
    },
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
          admin: { description: 'Nom de l\u2019auteur cité' },
        },
        {
          name: 'authorRole',
          type: 'text',
          label: 'Rôle de l\u2019auteur',
          admin: { description: 'Fonction ou contexte (optionnel)' },
        },
      ],
    },
    {
      name: 'preview',
      type: 'ui',
      admin: { components: { Field: '/components/SlidePreview#default' } },
    },
  ],
};
