import type { CollectionConfig } from 'payload';

import { isAdmin, isAdminOrSelf, isLoggedIn } from '../access/roles';
import { CoverBlock } from '../blocks/CoverBlock';
import { SectionBlock } from '../blocks/SectionBlock';
import { StatementBlock } from '../blocks/StatementBlock';
import { TwoColsBlock } from '../blocks/TwoColsBlock';
import { CardGridBlock } from '../blocks/CardGridBlock';
import { StatsBlock } from '../blocks/StatsBlock';
import { TestimonialsBlock } from '../blocks/TestimonialsBlock';
import { OfficesBlock } from '../blocks/OfficesBlock';
import { CtaBlock } from '../blocks/CtaBlock';
import { EndBlock } from '../blocks/EndBlock';
import { MarkdownBlock } from '../blocks/MarkdownBlock';
import { afterPresentationChange } from '../hooks/afterPresentationChange';

export const Presentations: CollectionConfig = {
  slug: 'presentations',
  labels: { singular: 'Présentation', plural: 'Présentations' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', 'status', 'updatedAt'],
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
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      label: 'Client',
      admin: { description: 'Client associé à cette présentation' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Statut',
      admin: { description: 'État de publication de la présentation' },
      options: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'Publiée', value: 'published' },
        { label: 'Archivée', value: 'archived' },
      ],
    },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      label: 'Tags',
      admin: { description: 'Catégories de la présentation' },
      options: [
        { label: 'Pitch', value: 'pitch' },
        { label: 'Formation', value: 'formation' },
        { label: 'Client', value: 'client' },
      ],
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
    {
      name: 'slides',
      type: 'blocks',
      label: 'Diapositives',
      admin: { description: 'Contenu de la présentation, une diapositive par bloc' },
      blocks: [
        CoverBlock,
        SectionBlock,
        StatementBlock,
        TwoColsBlock,
        CardGridBlock,
        StatsBlock,
        TestimonialsBlock,
        OfficesBlock,
        CtaBlock,
        EndBlock,
        MarkdownBlock,
      ],
    },
    {
      name: 'pdfFile',
      type: 'upload',
      relationTo: 'media',
      label: 'Fichier PDF',
      admin: {
        description: 'PDF généré automatiquement par le système de build',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'spaUrl',
      type: 'text',
      label: 'URL de la présentation web',
      admin: {
        description: 'Lien vers la version web interactive (généré automatiquement)',
        readOnly: true,
        position: 'sidebar',
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
        position: 'sidebar',
      },
    },
    {
      name: 'lastBuildStatus',
      type: 'select',
      defaultValue: 'idle',
      label: 'Statut du dernier build',
      admin: {
        description: 'État du dernier processus de génération',
        readOnly: true,
        position: 'sidebar',
      },
      options: [
        { label: 'En attente', value: 'idle' },
        { label: 'En cours', value: 'building' },
        { label: 'Réussi', value: 'success' },
        { label: 'Échoué', value: 'failed' },
      ],
    },
    {
      name: 'lastBuildError',
      type: 'textarea',
      label: 'Erreur du dernier build',
      admin: {
        description: 'Détails de l\'erreur en cas d\'échec du build',
        readOnly: true,
        position: 'sidebar',
      },
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
