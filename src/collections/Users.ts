import type { CollectionConfig } from 'payload';

import { ROLES } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

export const Users: CollectionConfig = {
  slug: COLLECTIONS.users,
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom',
      admin: { description: 'Nom affiché (rempli automatiquement via Google)' },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: ROLES.author,
      options: [
        { label: 'Administrateur', value: ROLES.admin },
        { label: 'Auteur', value: ROLES.author },
        { label: 'Lecteur', value: ROLES.viewer },
      ],
    },
  ],
};
