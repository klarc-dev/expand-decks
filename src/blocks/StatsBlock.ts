import type { Block } from 'payload';

export const StatsBlock: Block = {
  slug: 'stats',
  labels: { singular: 'Statistiques', plural: 'Statistiques' },
  imageURL: '/block-previews/stats.svg',
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
      admin: { description: 'Titre principal de la diapositive' },
    },
    {
      name: 'surface',
      type: 'select',
      label: 'Surface',
      defaultValue: 'dark',
      admin: { description: 'Apparence de fond de la diapositive' },
      options: [
        { label: 'Sombre', value: 'dark' },
        { label: 'Clair', value: 'light' },
      ],
    },
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
          admin: { description: 'Chiffre ou donnée (ex. "360\u00b0", "4")' },
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
  ],
};
