import type { Block } from 'payload';

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
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image',
      admin: { description: 'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)' },
    },
    {
      name: 'imagePosition',
      type: 'select',
      label: 'Position de l’image',
      defaultValue: 'right',
      admin: {
        description: 'Côté où l’image s’affiche quand une image est renseignée',
        condition: (_, siblingData) => Boolean(siblingData?.image),
      },
      options: [
        { label: 'Droite', value: 'right' },
        { label: 'Gauche', value: 'left' },
      ],
    },
    {
      name: 'preview',
      type: 'ui',
      admin: { components: { Field: '/components/SlidePreview#default' } },
    },
  ],
};
