import type { CollectionConfig } from 'payload';

import { ROLES, isAdmin, isAdminOrSelfUser, isAdminField, userIsAdminOrAuthor } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

export const Users: CollectionConfig = {
  slug: COLLECTIONS.users,
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    admin: ({ req: { user } }) => userIsAdminOrAuthor(user),
    create: isAdmin,
    read: isAdminOrSelfUser,
    update: isAdminOrSelfUser,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // OAuth auto-signup writes via the DB adapter, which bypasses field
        // defaults — stamp a role so new users never land role-less (and never
        // as admin). Normal admin-panel creates already carry an explicit role.
        if (operation === 'create' && !data.role) {
          data.role = ROLES.author;
        }
        return data;
      },
    ],
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
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      options: [
        { label: 'Administrateur', value: ROLES.admin },
        { label: 'Auteur', value: ROLES.author },
        { label: 'Lecteur', value: ROLES.viewer },
      ],
    },
  ],
};
