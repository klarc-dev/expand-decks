import type { CollectionConfig } from 'payload';

import { isAdmin, isOwnOrganisation, isOwnOrganisationAuthor } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';
import { afterOrganisationChange } from '../hooks/afterOrganisationChange';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const colorField = (name: string, label: string, description: string, defaultValue: string) => ({
  name,
  type: 'text' as const,
  required: true,
  defaultValue,
  label,
  admin: {
    description,
    components: { Field: '/components/ColorField#default' },
  },
  validate: (value: string | null | undefined) =>
    value && HEX_RE.test(value) ? true : 'Couleur hexadécimale requise (ex. #02585C)',
});

const httpsUrl = (value: string | null | undefined) =>
  !value || /^https:\/\//.test(value) ? true : 'URL https requise (ex. https://www.exemple.fr)';

const logoField = (name: string, label: string, description: string) => ({
  name,
  type: 'upload' as const,
  relationTo: COLLECTIONS.media,
  label,
  admin: { description },
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
    // Creating an organisation implies granting membership, which only an
    // admin can do (the `organisations` field on Users is admin-write) —
    // otherwise an author would strand an org nobody belongs to.
    create: isAdmin,
    read: isOwnOrganisation,
    update: isOwnOrganisationAuthor,
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
            colorField(
              'primary',
              'Primaire',
              'Couleur principale (titres, accents forts)',
              '#02585C',
            ),
            colorField(
              'secondary',
              'Accent',
              'Couleur secondaire (puces, éléments décoratifs)',
              '#F5A3B0',
            ),
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
      type: 'collapsible',
      label: 'Logos',
      admin: {
        initCollapsed: false,
        description:
          'Le gabarit choisit la version selon le fond : logo couleur sur les diapositives claires, logo blanc sur les diapositives colorées. Chaque version est optionnelle.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            logoField('logo', 'Logo couleur', 'Version couleur, affichée sur fond clair'),
            logoField(
              'logoWhite',
              'Logo blanc',
              'Version blanche, affichée sur fond coloré ou sombre',
            ),
            logoField(
              'logoBlack',
              'Logo noir',
              'Version noire, utilisée sur fond clair si la version couleur manque',
            ),
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Coordonnées',
      admin: {
        initCollapsed: false,
        description:
          'Liens publics : le site web rend le logo et le nom du pied de page cliquables ; l’URL de rendez-vous est disponible comme balise {org.bookingUrl} pour les boutons CTA.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'website',
              type: 'text',
              label: 'Site web',
              admin: { description: 'URL https ; cible du logo et du nom en pied de page' },
              validate: httpsUrl,
            },
            {
              name: 'bookingUrl',
              type: 'text',
              label: 'Prise de rendez-vous',
              admin: {
                description: 'URL https d’un agenda en ligne, proposée aux boutons du bloc cta',
              },
              validate: httpsUrl,
            },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'headingFont',
          type: 'text',
          required: true,
          defaultValue: 'Gilroy',
          label: 'Police des titres',
          admin: {
            description: 'Famille Google Fonts pour les titres',
            components: { Field: '/components/GoogleFontField#default' },
          },
        },
        {
          name: 'bodyFont',
          type: 'text',
          required: true,
          defaultValue: 'Roboto',
          label: 'Police du corps',
          admin: {
            description: 'Famille Google Fonts pour le corps de texte',
            components: { Field: '/components/GoogleFontField#default' },
          },
        },
      ],
    },
  ],
};
