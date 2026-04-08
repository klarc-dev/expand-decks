import type { CollectionConfig } from 'payload';

import { isAdmin, isLoggedIn } from '../access/roles';

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'M\u00e9dia', plural: 'M\u00e9dias' },
  access: {
    create: isLoggedIn,
    read: isLoggedIn,
    update: isLoggedIn,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 576, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texte alternatif',
      admin: { description: 'Description de l\u2019image pour l\u2019accessibilit\u00e9' },
    },
  ],
};
