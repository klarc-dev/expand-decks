import type { CollectionConfig } from 'payload';

import { isAdmin, isAdminOrSelf, isLoggedIn } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';
import { afterOrganisationChange } from '../hooks/afterOrganisationChange';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const colorField = (name: string, label: string, description: string, defaultValue: string) =>
  ({
    name,
    type: 'text' as const,
    required: true,
    defaultValue,
    label,
    admin: { description },
    validate: (value: string | null | undefined) =>
      value && HEX_RE.test(value) ? true : 'Couleur hexadécimale requise (ex. #02585C)',
  });

export const Organisations: CollectionConfig = {
  slug: COLLECTIONS.organisations,
  labels: { singular: 'Organisation', plural: 'Organisations' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description:
      'Charte graphique réutilisable : couleurs, logo et polices appliqués aux présentations qui la référencent.',
  },
  access: {
    create: isLoggedIn,
    read: isLoggedIn,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [afterOrganisationChange],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom',
      admin: { description: 'Nom de l’organisation (disponible comme balise {org.name})' },
    },
    {
      type: 'collapsible',
      label: 'Couleurs',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            colorField('primary', 'Primaire', 'Couleur principale (titres, accents forts)', '#02585C'),
            colorField('secondary', 'Accent', 'Couleur secondaire (puces, éléments décoratifs)', '#F5A3B0'),
          ],
        },
        {
          type: 'row',
          fields: [
            colorField('ink', 'Texte', 'Couleur du texte courant', '#0F2A2B'),
            colorField('paper', 'Fond', 'Couleur de fond des diapositives claires', '#FAFBFB'),
          ],
        },
      ],
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: COLLECTIONS.media,
      label: 'Logo',
      admin: { description: 'Logo affiché en haut des diapositives (optionnel)' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'headingFont',
          type: 'select',
          required: true,
          defaultValue: 'Gilroy',
          label: 'Police des titres',
          options: [
            { label: 'Gilroy', value: 'Gilroy' },
            { label: 'Roboto', value: 'Roboto' },
          ],
        },
        {
          name: 'bodyFont',
          type: 'select',
          required: true,
          defaultValue: 'Roboto',
          label: 'Police du corps',
          options: [
            { label: 'Roboto', value: 'Roboto' },
            { label: 'Gilroy', value: 'Gilroy' },
          ],
        },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: COLLECTIONS.users,
      label: 'Créé par',
      admin: { readOnly: true, position: 'sidebar', description: 'Auteur de l’organisation' },
      hooks: {
        beforeChange: [({ req, operation }) => (operation === 'create' ? req.user?.id : undefined)],
      },
    },
  ],
};
