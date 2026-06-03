import type { Block } from 'payload';

export const TwoColsBlock: Block = {
  slug: 'twoCols',
  labels: { singular: 'Deux colonnes', plural: 'Deux colonnes' },
  imageURL: '/block-previews/twoCols.svg',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Accroche',
      admin: { description: 'Texte court au-dessus du titre (ex. "01 \u00b7 Conseil financier")' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre principal de la diapositive' },
    },
    {
      name: 'intro',
      type: 'textarea',
      label: 'Introduction',
      admin: { description: 'Paragraphe d\u2019introduction dans la colonne gauche' },
    },
    {
      name: 'leftFooter',
      type: 'textarea',
      label: 'Pied gauche',
      admin: { description: 'Texte ou statistique en bas de la colonne gauche' },
    },
    {
      name: 'rightCards',
      type: 'array',
      label: 'Cartes (colonne droite)',
      admin: { description: 'Liste de cartes affich\u00e9es dans la colonne droite' },
      fields: [
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
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image',
      admin: { description: 'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left). Remplace les rightCards si renseignée.' },
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
