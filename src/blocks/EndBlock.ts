import type { Block } from 'payload';

export const EndBlock: Block = {
  slug: 'end',
  labels: { singular: 'Diapositive de fin', plural: 'Diapositives de fin' },
  imageURL: '/block-previews/end.svg',
  fields: [
    {
      name: 'wordmark',
      type: 'text',
      label: 'Marque',
      admin: { description: 'Nom ou logo textuel affich\u00e9 en grand (ex. "Klarc")' },
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Slogan',
      admin: { description: 'Phrase d\u2019accroche sous la marque' },
    },
    {
      name: 'footerNote',
      type: 'text',
      label: 'Note de fin',
      admin: { description: 'Texte en bas de la diapositive (ex. "Merci \u2014 site.com")' },
    },
  ],
};
