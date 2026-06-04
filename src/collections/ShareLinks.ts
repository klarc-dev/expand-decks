import { randomBytes } from 'node:crypto';

import type { CollectionConfig, PayloadRequest } from 'payload';

import { isAdminOrAuthor, isAdmin } from '../access/roles';
import { sha256 } from '../lib/shareLinks';

const buildShareUrl = (token: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || '';
  return `${baseUrl}/share/${token}`;
};

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
  endpoints: [
    {
      // Rotate the token and return the fresh share URL. The raw token is
      // never stored (only its SHA-256), so this is the only way to obtain a
      // working URL after creation. Rotating invalidates the previous URL.
      path: '/:id/rotate',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const user = req.user;
        if (!user || (user.role !== 'admin' && user.role !== 'author')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const id = req.routeParams?.id as string | undefined;
        if (!id) {
          return Response.json({ error: 'Missing id' }, { status: 400 });
        }

        let link;
        try {
          link = await req.payload.findByID({
            collection: 'share-links',
            id,
            depth: 0,
            overrideAccess: true,
          });
        } catch {
          return Response.json({ error: 'Not found' }, { status: 404 });
        }

        const createdById =
          typeof link.createdBy === 'object' ? link.createdBy?.id : link.createdBy;
        if (user.role !== 'admin' && createdById !== user.id) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const token = randomBytes(32).toString('base64url');
        await req.payload.update({
          collection: 'share-links',
          id,
          data: { tokenHash: sha256(token) },
          overrideAccess: true,
        });

        return Response.json({ shareUrl: buildShareUrl(token) });
      },
    },
  ],
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
          return {
            ...doc,
            shareUrl: buildShareUrl(req.context.shareToken as string),
          };
        }
        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'shareUrlField',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/ShareUrlField#default',
        },
      },
    },
    {
      name: 'presentation',
      type: 'relationship',
      relationTo: 'presentations',
      required: true,
      label: 'Présentation',
      admin: { description: 'Présentation partagée via ce lien' },
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Hash du jeton',
      admin: {
        // Internal value filled by the beforeChange hook — showing it only
        // produced a red "required" error on a field authors cannot edit.
        hidden: true,
        readOnly: true,
        description: 'SHA-256 du jeton de partage (le jeton brut n\'est jamais stocké)',
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
      label: 'Créé par',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Utilisateur ayant généré le lien',
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
      label: 'Dernière consultation',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Date de la dernière consultation',
      },
    },
  ],
};
