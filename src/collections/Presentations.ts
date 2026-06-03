import type { CollectionConfig } from 'payload';

import { isAdmin, isAdminOrSelf, isLoggedIn } from '../access/roles';
import { CoverBlock } from '../blocks/CoverBlock';
import { SectionBlock } from '../blocks/SectionBlock';
import { StatementBlock } from '../blocks/StatementBlock';
import { TwoColsBlock } from '../blocks/TwoColsBlock';
import { CardGridBlock } from '../blocks/CardGridBlock';
import { StatsBlock } from '../blocks/StatsBlock';
import { QuotesBlock } from '../blocks/QuotesBlock';
import { CtaBlock } from '../blocks/CtaBlock';
import { MarkdownBlock } from '../blocks/MarkdownBlock';
import { afterPresentationChange } from '../hooks/afterPresentationChange';

export const Presentations: CollectionConfig = {
  slug: 'presentations',
  labels: { singular: 'Présentation', plural: 'Présentations' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', 'status', 'updatedAt'],
    livePreview: {
      url: '/preview',
    },
  },
  access: {
    create: isAdminOrSelf,
    read: isLoggedIn,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [afterPresentationChange],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Titre de la présentation (ex. "Klarc — L\'innovation à 360°")' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenu',
          description: 'Rédigez le contenu de la présentation.',
          fields: [
            {
              name: 'draftFromBrief',
              type: 'ui',
              admin: {
                components: {
                  Field: '/components/DraftFromBriefButton#default',
                },
              },
            },
            {
              name: 'slides',
              type: 'blocks',
              label: 'Diapositives',
              admin: { description: 'Une diapositive par bloc. Choisissez un type de bloc pour ajouter une slide.' },
              blocks: [
                CoverBlock,
                SectionBlock,
                StatementBlock,
                TwoColsBlock,
                CardGridBlock,
                StatsBlock,
                QuotesBlock,
                CtaBlock,
                MarkdownBlock,
              ],
            },
          ],
        },
        {
          label: 'Métadonnées',
          description: 'Informations de classement et de publication.',
          fields: [
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Identifiant',
              admin: { description: 'URL unique (lettres minuscules, chiffres et tirets, max 64 caractères)' },
              validate: (value: string | null | undefined) => {
                if (!value) return 'L\'identifiant est requis';
                if (!/^[a-z0-9-]{1,64}$/.test(value)) return 'Format invalide : 1 à 64 caractères parmi a-z, 0-9, -';
                return true;
              },
            },
            {
              name: 'tags',
              type: 'text',
              hasMany: true,
              label: 'Tags',
              admin: { description: 'Mots-clés libres pour classer la présentation' },
            },
            {
              name: 'language',
              type: 'select',
              required: true,
              defaultValue: 'fr',
              label: 'Langue',
              admin: { description: 'Langue du contenu de la présentation' },
              options: [
                { label: 'Français', value: 'fr' },
                { label: 'Anglais', value: 'en' },
              ],
            },
          ],
        },
        {
          label: 'Sortie',
          description: 'Artefacts générés automatiquement par le build (disponibles après publication).',
          fields: [
            {
              name: 'lastBuildStatus',
              type: 'select',
              defaultValue: 'idle',
              label: 'Statut du dernier build',
              admin: {
                description: 'État du dernier processus de génération',
                readOnly: true,
              },
              options: [
                { label: 'En attente', value: 'idle' },
                { label: 'En cours', value: 'building' },
                { label: 'Réussi', value: 'success' },
                { label: 'Échoué', value: 'failed' },
              ],
            },
            {
              name: 'spaUrl',
              type: 'text',
              label: 'URL de la présentation web',
              admin: {
                description: 'Lien vers la version web interactive (généré automatiquement)',
                readOnly: true,
              },
            },
            {
              name: 'pdfFile',
              type: 'upload',
              relationTo: 'media',
              label: 'Fichier PDF',
              admin: {
                description: 'PDF généré automatiquement par le système de build',
                readOnly: true,
              },
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Image de couverture',
              admin: {
                description: 'Miniature générée à partir de la première diapositive',
                readOnly: true,
              },
            },
            {
              name: 'lastBuildError',
              type: 'textarea',
              label: 'Erreur du dernier build',
              admin: {
                description: 'Détails de l\'erreur en cas d\'échec du build',
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Statut',
      admin: {
        description: 'État de publication',
        position: 'sidebar',
      },
      options: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'Publiée', value: 'published' },
        { label: 'Archivée', value: 'archived' },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Créé par',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Auteur de la présentation',
      },
      hooks: {
        beforeChange: [
          ({ req, operation }) => {
            if (operation === 'create') return req.user?.id;
            return undefined;
          },
        ],
      },
    },
  ],
};
