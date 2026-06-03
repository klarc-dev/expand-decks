import type { Block } from 'payload';

export const StatementBlock: Block = {
  slug: 'statement',
  labels: { singular: 'Affirmation', plural: 'Affirmations' },
  imageURL: '/block-previews/statement.svg',
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
      admin: { description: 'Citation ou affirmation principale' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Corps',
      admin: { description: 'Texte développant l\u2019affirmation' },
    },
    {
      name: 'footer',
      type: 'text',
      label: 'Pied de page',
      admin: { description: 'Légende ou note en bas de la diapositive' },
    },
    {
      name: 'preview',
      type: 'ui',
      admin: { components: { Field: '/components/SlidePreview#default' } },
    },
  ],
};
