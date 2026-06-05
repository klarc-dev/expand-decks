import type { Block } from 'payload';

import { eyebrowField, previewField, surfaceField, titleField } from './_shared';

export const StatsBlock: Block = {
  slug: 'stats',
  labels: { singular: 'Statistiques', plural: 'Statistiques' },
  imageURL: '/block-previews/stats.svg',
  fields: [
    eyebrowField(),
    titleField('Titre principal de la diapositive'),
    surfaceField(),
    {
      name: 'stats',
      type: 'array',
      label: 'Chiffres clés',
      admin: { description: 'Paires valeur/libellé affichées en ligne' },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Valeur',
          admin: { description: 'Chiffre ou donnée (ex. "360°", "4")' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Libellé',
          admin: { description: 'Description courte de la valeur' },
        },
      ],
    },
    previewField,
  ],
};
