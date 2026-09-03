import type { CollectionConfig, FieldAccess, FieldHook } from 'payload';

import { isAdminOrAuthor, isAdminOrCreator } from '../access/roles';
import { beforeKnowledgeBaseDelete } from '../hooks/knowledgeLifecycle';
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';

const stampCreator: FieldHook = ({ req, operation, value }) =>
  operation === 'create' ? req.user?.id : value;

const trustedLifecycleWrite: FieldAccess = ({ req }) =>
  req.context?.[CTX.trustedKnowledgeLifecycle] === true;

export const KnowledgeBases: CollectionConfig = {
  slug: COLLECTIONS.knowledgeBases,
  labels: { singular: 'Base de connaissances', plural: 'Bases de connaissances' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'documentCount', 'chunkCount', 'lastIndexedAt', 'updatedAt'],
    description:
      'Corpus documentaire réutilisable : déposez-y vos documents pour que l’agent puisse s’y appuyer.',
  },
  access: {
    create: isAdminOrAuthor,
    read: isAdminOrCreator,
    update: isAdminOrCreator,
    delete: isAdminOrCreator,
  },
  hooks: {
    beforeDelete: [beforeKnowledgeBaseDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom',
      admin: { description: 'Nom de la base de connaissances (ex. « Contrats clients 2026 »)' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        rows: 3,
        description: 'Ce que contient cette base, pour que vos collègues s’y retrouvent.',
      },
    },
    {
      // Read-only synthesis, written by the ingestion job (ticket ultérieur).
      // Displayed here so an author can gauge how rich a base is before
      // selecting it for a draft.
      type: 'row',
      fields: [
        {
          name: 'documentCount',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Documents',
          admin: {
            readOnly: true,
            description: 'Nombre de documents déposés dans cette base',
          },
          access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
        },
        {
          name: 'chunkCount',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Fragments',
          admin: {
            readOnly: true,
            description: 'Nombre total de fragments indexés (rempli automatiquement)',
          },
          access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
        },
      ],
    },
    {
      name: 'lastIndexedAt',
      type: 'date',
      label: 'Dernière indexation',
      admin: {
        readOnly: true,
        description: 'Date de la dernière indexation réussie (remplie automatiquement)',
      },
      access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: COLLECTIONS.users,
      index: true,
      label: 'Créée par',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Auteur de la base de connaissances',
      },
      hooks: { beforeChange: [stampCreator] },
      access: { create: () => false, update: () => false },
    },
  ],
};
