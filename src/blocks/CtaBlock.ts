import type { Block } from 'payload';

export const CtaBlock: Block = {
  slug: 'cta',
  labels: { singular: 'Appel \u00e0 l\u2019action', plural: 'Appels \u00e0 l\u2019action' },
  imageURL: '/block-previews/cta.svg',
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
      admin: { description: 'Titre principal centré (ex. "Merci", "Et maintenant ?")' },
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Sous-titre',
      admin: { description: 'Phrase d\u2019accroche sous le titre' },
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
    {
      name: 'preview',
      type: 'ui',
      admin: { components: { Field: '/components/SlidePreview#default' } },
    },
  ],
};
