import type { Block } from 'payload';

export const OfficesBlock: Block = {
  slug: 'offices',
  labels: { singular: 'Bureaux', plural: 'Bureaux' },
  imageURL: '/block-previews/offices.svg',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Accroche',
      admin: { description: 'Texte court au-dessus du titre (ex. "Pr\u00e9sence")' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre de la section bureaux' },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Sous-titre',
      admin: { description: 'Description compl\u00e9mentaire' },
    },
    {
      name: 'offices',
      type: 'array',
      label: 'Bureaux',
      admin: { description: 'Liste des implantations g\u00e9ographiques' },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Ville',
          admin: { description: 'Nom de la ville (ex. "Lyon")' },
        },
        {
          name: 'region',
          type: 'text',
          label: 'R\u00e9gion',
          admin: { description: 'R\u00e9gion ou zone g\u00e9ographique' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Libell\u00e9',
          admin: { description: 'Identifiant du bureau (ex. "Bureau Sud-Est")' },
        },
        {
          name: 'specialties',
          type: 'text',
          label: 'Sp\u00e9cialit\u00e9s',
          admin: { description: 'Domaines d\u2019expertise du bureau (ex. "Biotech \u00b7 Medtech")' },
        },
      ],
    },
  ],
};
