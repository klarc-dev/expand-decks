import { APIError, type CollectionConfig, type FieldHook } from 'payload';

import {
  isAdminOrAuthor,
  isOrganisationAuthor,
  isOrganisationMember,
  relationshipId,
  userOrganisationIds,
  userIsOrganisationMember,
  userIsAdmin,
} from '../access/roles';
import { beforeKnowledgeBaseDelete } from '../hooks/knowledgeLifecycle';
import { COLLECTIONS } from '../lib/collections';
import { trustedLifecycleWrite } from './KnowledgeDocuments';

/**
 * Server-side owner of the `organisation` value: fills in the author's sole
 * organisation on create and refuses a base handed to an organisation the
 * author does not belong to.
 *
 * Membership is asserted only when the write actually *changes* the
 * organisation. An update that leaves it untouched has nothing to authorise —
 * collection `access.update` already gated the write — and Payload replays the
 * stored value into every update, so the readiness sync fired by the ingest
 * cron (`req.user === null`) would otherwise be rejected with a 403 and break
 * indexing.
 */
const resolveKnowledgeBaseOrganisation: FieldHook = ({ value, req, operation, originalDoc }) => {
  const stored = relationshipId(originalDoc?.organisation);
  let organisation = value;
  if (organisation === undefined && operation === 'update') {
    organisation = originalDoc?.organisation;
  }
  if (organisation === undefined && operation === 'create') {
    const ids = userOrganisationIds(req.user);
    if (ids.length === 1) organisation = ids[0];
  }
  const id = relationshipId(organisation);
  if (id === undefined) {
    throw new APIError('Choisissez une organisation pour cette base de connaissances.', 400);
  }
  if (operation === 'update' && stored !== undefined && String(id) === String(stored)) {
    return organisation;
  }
  if (!userIsOrganisationMember(req.user, id)) {
    throw new APIError('Vous ne faites pas partie de cette organisation.', 403);
  }
  return organisation;
};

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
        beforeValidate: [resolveKnowledgeBaseOrganisation],
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
      name: 'readiness',
      type: 'select',
      defaultValue: 'empty',
      index: true,
      label: 'État',
      access: { create: trustedLifecycleWrite, update: trustedLifecycleWrite },
      options: [
        { label: 'Prête', value: 'ready' },
        { label: 'Vide', value: 'empty' },
        { label: 'Échec', value: 'failed' },
        { label: 'Indisponible', value: 'unavailable' },
      ],
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Mise à jour automatiquement selon les documents indexés.',
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
  ],
};
