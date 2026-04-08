import type { Block } from 'payload';

export const CtaBlock: Block = {
  slug: 'cta',
  labels: { singular: 'Appel \u00e0 l\u2019action', plural: 'Appels \u00e0 l\u2019action' },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Accroche',
      admin: { description: 'Question ou phrase d\u2019amorce (ex. "Pr\u00eat \u00e0 concr\u00e9tiser ?")' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre principal de l\u2019appel \u00e0 l\u2019action' },
    },
    {
      name: 'primaryAction',
      type: 'text',
      label: 'Action principale',
      admin: { description: 'Texte du bouton principal (ex. "Prendre rendez-vous \u2192")' },
    },
    {
      name: 'secondaryAction',
      type: 'text',
      label: 'Action secondaire',
      admin: { description: 'Texte du lien secondaire (ex. num\u00e9ro de t\u00e9l\u00e9phone)' },
    },
    {
      name: 'contactRows',
      type: 'array',
      label: 'Coordonn\u00e9es',
      admin: { description: 'Lignes de contact affich\u00e9es sous les boutons' },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Libell\u00e9',
          admin: { description: '\u00c9tiquette de la ligne (ex. "Web", "Lyon")' },
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Valeur',
          admin: { description: 'Contenu de la ligne (ex. URL, adresse, t\u00e9l\u00e9phone)' },
        },
      ],
    },
  ],
};
