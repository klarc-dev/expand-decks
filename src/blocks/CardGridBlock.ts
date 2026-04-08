import type { Block } from 'payload';

export const CardGridBlock: Block = {
  slug: 'cardGrid',
  labels: { singular: 'Grille de cartes', plural: 'Grilles de cartes' },
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
      admin: { description: 'Titre principal de la grille' },
    },
    {
      name: 'sidebarText',
      type: 'textarea',
      label: 'Texte latéral',
      admin: { description: 'Texte optionnel affiché sur le côté de la grille' },
    },
    {
      name: 'columns',
      type: 'select',
      label: 'Colonnes',
      defaultValue: '4',
      admin: { description: 'Nombre de colonnes dans la grille' },
      options: [
        { label: '2 colonnes', value: '2' },
        { label: '3 colonnes', value: '3' },
        { label: '4 colonnes', value: '4' },
      ],
    },
    {
      name: 'cards',
      type: 'array',
      label: 'Cartes',
      admin: { description: 'Liste des cartes à afficher dans la grille' },
      fields: [
        {
          name: 'number',
          type: 'text',
          label: 'Numéro',
          admin: { description: 'Numéro ou identifiant de la carte (ex. "01")' },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Titre',
          admin: { description: 'Titre de la carte' },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          admin: { description: 'Contenu descriptif de la carte' },
        },
      ],
    },
  ],
};
