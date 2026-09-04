import type { Access, CollectionConfig, Where } from 'payload';

import { isAdmin, isLoggedIn, userIsAdmin, userOrganisationIds } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

export const canReadMedia: Access = async ({ req }) => {
  const { user } = req;
  if (!user) return false;
  if (userIsAdmin(user)) return true;

  const scoped: Where = {
    or: [
      { presentation: { exists: false } },
      { presentation: { equals: null } },
      { 'presentation.organisation': { in: userOrganisationIds(user) } },
    ],
  };
  return scoped;
};

export const Media: CollectionConfig = {
  slug: COLLECTIONS.media,
  labels: { singular: 'M\u00e9dia', plural: 'M\u00e9dias' },
  access: {
    create: isLoggedIn,
    read: canReadMedia,
    update: isAdmin,
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
    {
      // Links a generated artifact (e.g. exported PDF) to its source
      // presentation so read access can be scoped to that deck's owner.
      // Left empty for ordinary uploads, which stay readable to any logged-in
      // user via canReadMedia.
      name: 'presentation',
      type: 'relationship',
      relationTo: COLLECTIONS.presentations,
      label: 'Pr\u00e9sentation source',
      admin: {
        readOnly: true,
        description:
          'Artefact g\u00e9n\u00e9r\u00e9 pour cette pr\u00e9sentation (rempli automatiquement).',
      },
    },
  ],
};
