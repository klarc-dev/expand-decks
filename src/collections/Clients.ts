import type { CollectionConfig } from 'payload';

import { isAdmin, isAdminOrAuthor, isLoggedIn } from '../access/roles';

export const Clients: CollectionConfig = {
  slug: 'clients',
  labels: { singular: 'Client', plural: 'Clients' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
  },
  access: {
    create: isAdminOrAuthor,
    read: isLoggedIn,
    update: isAdminOrAuthor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom',
      admin: { description: 'Nom du client ou de l\u2019entreprise' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Identifiant',
      admin: { description: 'Identifiant unique en minuscules (ex. "klarc")' },
      validate: (value: string | null | undefined) => {
        if (!value) return 'L\u2019identifiant est requis';
        if (!/^[a-z0-9-]+$/.test(value)) return 'Uniquement des lettres minuscules, chiffres et tirets';
        return true;
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
      admin: { description: 'Logo du client (format carr\u00e9 recommand\u00e9)' },
    },
    {
      name: 'color',
      type: 'text',
      label: 'Couleur de marque',
      admin: { description: 'Code couleur hexad\u00e9cimal (ex. "#1a2b3c")' },
    },
    {
      name: 'notes',
      type: 'richText',
      label: 'Notes',
      admin: { description: 'Notes internes sur le client' },
    },
  ],
};
