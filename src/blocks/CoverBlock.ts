import type { Block } from 'payload';

import { eyebrowField, imageFields, previewField, surfaceField } from './_shared';

export const CoverBlock: Block = {
  slug: 'cover',
  labels: { singular: 'Couverture', plural: 'Couvertures' },
  imageURL: '/block-previews/cover.svg',
  fields: [
    eyebrowField('Texte court au-dessus du titre principal'),
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
    surfaceField({ gradient: true }),
    ...imageFields(),
    previewField,
  ],
};
