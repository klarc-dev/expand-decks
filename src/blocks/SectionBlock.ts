import type { Block } from 'payload';

export const SectionBlock: Block = {
  slug: 'section',
  labels: { singular: 'Section', plural: 'Sections' },
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
  ],
};
