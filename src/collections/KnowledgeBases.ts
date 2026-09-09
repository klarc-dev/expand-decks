import { APIError, type CollectionConfig, type FieldHook } from 'payload';

import {
  isAdminOrAuthor,
  isOrganisationAuthor,
  isOrganisationMember,
  userOrganisationIds,
  userIsOrganisationMember,
  userIsAdmin,
} from '../access/roles';
import { beforeKnowledgeBaseDelete } from '../hooks/knowledgeLifecycle';
import { COLLECTIONS } from '../lib/collections';

const stampCreator: FieldHook = ({ req, operation, value }) =>
  operation === 'create' ? req.user?.id : value;

export const KnowledgeBases: CollectionConfig = {
  slug: COLLECTIONS.knowledgeBases,
  labels: { singular: 'Base de connaissances', plural: 'Bases de connaissances' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'organisation', 'updatedAt'],
    description: 'Créez une base, puis ajoutez les fichiers que l’agent doit utiliser.',
  },
  access: {
    create: isAdminOrAuthor,
    read: isOrganisationMember,
    update: isOrganisationAuthor,
    delete: isOrganisationAuthor,
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
      name: 'organisation',
      type: 'relationship',
      relationTo: COLLECTIONS.organisations,
      required: true,
      index: true,
      label: 'Organisation',
      filterOptions: ({ user }) =>
        userIsAdmin(user) ? true : { id: { in: userOrganisationIds(user) } },
      hooks: {
        beforeValidate: [
          ({ value, req, operation, originalDoc }) => {
            let organisation = value;
            if (organisation === undefined && operation === 'update') {
              organisation = originalDoc?.organisation;
            }
            if (organisation === undefined && operation === 'create') {
              const ids = userOrganisationIds(req.user);
              if (ids.length === 1) organisation = ids[0];
            }
            if (organisation === undefined || organisation === null || organisation === '') {
              throw new APIError(
                'Choisissez une organisation pour cette base de connaissances.',
                400,
              );
            }
            if (!userIsOrganisationMember(req.user, organisation)) {
              throw new APIError('Vous ne faites pas partie de cette organisation.', 403);
            }
            return organisation;
          },
        ],
      },
      defaultValue: ({ user }) => {
        const ids = userOrganisationIds(user);
        return ids.length === 1 ? ids[0] : undefined;
      },
      admin: {
        description:
          'Organisation propriétaire de la base. Si vous êtes membre de plusieurs organisations, choisissez laquelle.',
      },
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
