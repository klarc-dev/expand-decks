import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
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
      defaultValue: 'author',
      options: [
        { label: 'Administrateur', value: 'admin' },
        { label: 'Auteur', value: 'author' },
        { label: 'Lecteur', value: 'viewer' },
      ],
    },
  ],
};
