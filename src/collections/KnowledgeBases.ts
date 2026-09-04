import type { CollectionConfig, FieldHook } from 'payload';

import { isAdminOrAuthor, isAdminOrCreator } from '../access/roles';
import { beforeKnowledgeBaseDelete } from '../hooks/knowledgeLifecycle';
import { COLLECTIONS } from '../lib/collections';

const stampCreator: FieldHook = ({ req, operation, value }) =>
  operation === 'create' ? req.user?.id : value;

export const KnowledgeBases: CollectionConfig = {
  slug: COLLECTIONS.knowledgeBases,
  labels: { singular: 'Base de connaissances', plural: 'Bases de connaissances' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description: 'Créez une base, puis ajoutez les fichiers que l’agent doit utiliser.',
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
    },
    {
      name: 'documents',
      type: 'join',
      collection: COLLECTIONS.knowledgeDocuments,
      on: 'knowledgeBase',
      label: 'Documents',
      defaultSort: '-updatedAt',
      admin: {
        allowCreate: true,
        defaultColumns: ['filename', 'indexingStatus', 'updatedAt'],
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: COLLECTIONS.users,
      index: true,
      label: 'Créée par',
      hidden: true,
      hooks: { beforeChange: [stampCreator] },
      access: { create: () => false, update: () => false },
    },
  ],
};
