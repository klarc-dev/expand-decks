import type { CollectionConfig } from 'payload';

import { isOrganisationMember } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';
import { LINKEDIN_DOCUMENT_CAROUSEL, MEDIA_PRODUCER_STATUS } from '../lib/mediaProducer';

export const MediaProductionRequests: CollectionConfig = {
  slug: COLLECTIONS.mediaProductionRequests,
  labels: { singular: 'Demande média', plural: 'Demandes média' },
  admin: { hidden: true, useAsTitle: 'requestId' },
  access: {
    create: () => false,
    read: isOrganisationMember,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'requestId', type: 'text', required: true, unique: true, index: true },
    { name: 'publicationId', type: 'text', required: true, index: true },
    { name: 'revisionSha256', type: 'text', required: true },
    {
      name: 'format',
      type: 'select',
      required: true,
      options: [
        { label: 'LinkedIn document via Postiz images', value: LINKEDIN_DOCUMENT_CAROUSEL },
      ],
    },
    {
      name: 'organisation',
      type: 'relationship',
      relationTo: COLLECTIONS.organisations,
      required: true,
      index: true,
    },
    {
      name: 'presentation',
      type: 'relationship',
      relationTo: COLLECTIONS.presentations,
      index: true,
    },
    { name: 'request', type: 'json', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: MEDIA_PRODUCER_STATUS.queued,
      options: Object.values(MEDIA_PRODUCER_STATUS).map((value) => ({ label: value, value })),
    },
    { name: 'result', type: 'json' },
    { name: 'buildToken', type: 'text', index: true },
  ],
};
