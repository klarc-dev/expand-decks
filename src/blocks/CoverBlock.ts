import type { Block } from 'payload';

export const CoverBlock: Block = {
  slug: 'cover',
  labels: { singular: 'Couverture', plural: 'Couvertures' },
  imageURL: '/block-previews/cover.svg',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Accroche',
      admin: { description: 'Texte court au-dessus du titre principal' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre principal de la diapositive de couverture' },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Sous-titre',
      admin: { description: 'Paragraphe descriptif sous le titre' },
    },
    {
      name: 'footerLeft',
      type: 'text',
      label: 'Pied de page gauche',
      admin: { description: 'Texte en bas à gauche (ex. lien ou action)' },
    },
    {
      name: 'footerRight',
      type: 'text',
      label: 'Pied de page droit',
      admin: { description: 'Texte en bas à droite (ex. date ou note)' },
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
        { label: 'Dégradé', value: 'gradient' },
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
