import { AuthenticationError, type CollectionConfig } from 'payload';

import {
  ROLES,
  isAdmin,
  isAdminOrAuthor,
  isAdminOrSelfUser,
  isAdminField,
  userIsAdminOrAuthor,
} from '../access/roles';
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
    read: isAdminOrAuthor,
    update: isAdminOrSelfUser,
    delete: isAdmin,
  },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        // OAuth-created users always carry an explicit status. Tolerate a
        // missing value only for backwards compatibility during deployment,
        // before the migration has backfilled existing users to `active`.
        if (user.membershipStatus && user.membershipStatus !== 'active') {
          throw new AuthenticationError();
        }
        return user;
      },
    ],
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
      name: 'title',
      type: 'text',
      label: 'Titre / fonction',
      admin: { description: 'Titre public affiché sur les cartes intervenants' },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: COLLECTIONS.media,
      label: 'Avatar',
      admin: { description: 'Image affichée sur les cartes intervenants' },
    },
    {
      name: 'membershipStatus',
      type: 'select',
      label: 'Statut du membre',
      required: true,
      defaultValue: 'active',
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        position: 'sidebar',
        description:
          'Les inscriptions Google arrivent en attente. Activez le membre pour autoriser sa connexion.',
      },
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'Actif', value: 'active' },
        { label: 'Refusé', value: 'rejected' },
      ],
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
