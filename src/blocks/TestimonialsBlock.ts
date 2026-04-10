import type { Block } from 'payload';

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  labels: { singular: 'Témoignages', plural: 'Témoignages' },
  imageURL: '/block-previews/testimonials.svg',
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
      admin: { description: 'Titre de la section témoignages' },
    },
    {
      name: 'rating',
      type: 'text',
      label: 'Note',
      admin: { description: 'Note globale affichée (ex. "5/5 \u00b7 28 avis")' },
    },
    {
      name: 'quotes',
      type: 'array',
      label: 'Citations',
      admin: { description: 'Liste des témoignages clients' },
      fields: [
        {
          name: 'quote',
          type: 'text',
          required: true,
          label: 'Citation',
          admin: { description: 'Texte du témoignage' },
        },
        {
          name: 'authorName',
          type: 'text',
          required: true,
          label: 'Nom de l\u2019auteur',
          admin: { description: 'Nom complet de la personne citée' },
        },
        {
          name: 'authorRole',
          type: 'text',
          label: 'R\u00f4le de l\u2019auteur',
          admin: { description: 'Poste et entreprise (ex. "Directeur innovation \u00b7 Acme")' },
        },
      ],
    },
  ],
};
