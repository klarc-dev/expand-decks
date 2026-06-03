import type { Block } from 'payload';

import { eyebrowField, previewField } from './_shared';

export const CtaBlock: Block = {
  slug: 'cta',
  labels: { singular: 'Appel à l’action', plural: 'Appels à l’action' },
  imageURL: '/block-previews/cta.svg',
  fields: [
    eyebrowField(),
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre principal centré (ex. "Merci", "Et maintenant ?")' },
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Sous-titre',
      admin: { description: 'Phrase d’accroche sous le titre' },
    },
    {
      name: 'primaryAction',
      type: 'text',
      label: 'Action principale',
      admin: { description: 'Texte du bouton principal (optionnel)' },
    },
    {
      name: 'secondaryAction',
      type: 'text',
      label: 'Action secondaire',
      admin: { description: 'Texte du lien secondaire (optionnel)' },
    },
    {
      name: 'footerNote',
      type: 'text',
      label: 'Note de bas',
      admin: { description: 'Texte en bas de la diapositive (optionnel)' },
    },
    previewField,
  ],
};
