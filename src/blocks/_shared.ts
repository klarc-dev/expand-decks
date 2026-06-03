import type { Field } from 'payload';

export const previewField: Field = {
  name: 'preview',
  type: 'ui',
  admin: { components: { Field: '/components/SlidePreview#default' } },
};

export const eyebrowField = (description = 'Texte court au-dessus du titre'): Field => ({
  name: 'eyebrow',
  type: 'text',
  label: 'Accroche',
  admin: { description },
});

export const surfaceField = (opts?: { gradient?: boolean }): Field => ({
  name: 'surface',
  type: 'select',
  label: 'Surface',
  defaultValue: 'dark',
  admin: { description: 'Apparence de fond de la diapositive' },
  options: [
    { label: 'Sombre', value: 'dark' },
    { label: 'Clair', value: 'light' },
    ...(opts?.gradient ? [{ label: 'Dégradé', value: 'gradient' }] : []),
  ],
});

export const imageFields = (
  description = 'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)',
): Field[] => ([
  {
    name: 'image',
    type: 'upload',
    relationTo: 'media',
    label: 'Image',
    admin: { description },
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
]);
