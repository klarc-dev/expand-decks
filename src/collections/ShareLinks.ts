import { randomBytes } from 'node:crypto';

import type { CollectionConfig } from 'payload';

import { isAdminOrAuthor, isAdmin } from '../access/roles';
import { sha256 } from '../lib/shareLinks';

export const ShareLinks: CollectionConfig = {
  slug: 'share-links',
  labels: { singular: 'Lien de partage', plural: 'Liens de partage' },
  admin: {
    useAsTitle: 'tokenHash',
    defaultColumns: ['presentation', 'expiresAt', 'viewCount', 'createdAt'],
  },
  access: {
    create: isAdminOrAuthor,
    read: isAdminOrAuthor,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create') {
          const token = randomBytes(32).toString('base64url');
          data.tokenHash = sha256(token);
          data.createdBy = req.user?.id;
          // Attach raw token to request context so afterChange can read it
          req.context.shareToken = token;
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc, req, operation }) => {
        if (operation === 'create' && req.context.shareToken) {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || '';
          return {
            ...doc,
            shareUrl: `${baseUrl}/share/${req.context.shareToken}`,
          };
        }
        return doc;
      },
    ],
    afterRead: [
      ({ doc }) => {
        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || '';
        // shareUrl is only meaningful in admin — the raw token is never stored,
        // so we show a truncated hash as an identifier instead.
        doc.shareUrlDisplay = `${baseUrl}/share/[token-hash:${doc.tokenHash?.slice(0, 8)}...]`;
        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'presentation',
      type: 'relationship',
      relationTo: 'presentations',
      required: true,
      label: 'Presentation',
      admin: { description: 'Presentation partagee via ce lien' },
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Hash du jeton',
      admin: {
        readOnly: true,
        description: 'SHA-256 du jeton de partage (le jeton brut n\'est jamais stocke)',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      label: 'Expiration',
      admin: { description: 'Date et heure d\'expiration du lien' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Cree par',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Utilisateur ayant genere le lien',
      },
    },
    {
      name: 'viewCount',
      type: 'number',
      defaultValue: 0,
      label: 'Nombre de vues',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Nombre total de consultations via ce lien',
      },
    },
    {
      name: 'lastViewedAt',
      type: 'date',
      label: 'Derniere consultation',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Date de la derniere consultation',
      },
    },
  ],
};
