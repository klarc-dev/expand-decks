import type { Block } from 'payload';

import { cardTitleDescFields, eyebrowField, imageFields, previewField, titleField } from './_shared';

export const TwoColsBlock: Block = {
  slug: 'twoCols',
  labels: { singular: 'Deux colonnes', plural: 'Deux colonnes' },
  imageURL: '/block-previews/twoCols.svg',
  fields: [
    eyebrowField('Texte court au-dessus du titre (ex. "01 · Conseil financier")'),
    titleField('Titre principal de la diapositive'),
    {
      name: 'intro',
      type: 'textarea',
      label: 'Introduction',
      admin: { description: 'Paragraphe d’introduction dans la colonne gauche' },
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
      admin: { description: 'Liste de cartes affichées dans la colonne droite' },
      fields: [
        ...cardTitleDescFields(),
      ],
    },
    ...imageFields('Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left). Remplace les rightCards si renseignée.'),
    previewField,
  ],
};
