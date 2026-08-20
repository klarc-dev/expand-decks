import { AuthenticationError, type CollectionAfterLoginHook, type CollectionConfig } from 'payload';

import {
  ROLES,
  isAdmin,
  isAdminOrAuthor,
  isAdminOrSelfUser,
  isAdminField,
  userIsAdminOrAuthor,
} from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

const GOOGLE_ISSUER = 'https://accounts.google.com';
const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const syncGoogleAvatar: CollectionAfterLoginHook = async ({ req, user }) => {
  try {
    const accounts = await req.payload.find({
      collection: COLLECTIONS.accounts,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: {
        and: [
          { user: { equals: user.id } },
          { issuerName: { equals: GOOGLE_ISSUER } },
          { picture: { exists: true } },
        ],
      },
    });
    const account = accounts.docs[0];
    if (!account?.picture) return user;

    const response = await fetch(account.picture);
    if (!response.ok) throw new Error(`Google avatar request failed (${response.status})`);

    const mimetype = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    const extension = AVATAR_MIME_EXTENSIONS[mimetype];
    if (!extension)
      throw new Error(`Unsupported Google avatar content type: ${mimetype || 'none'}`);

    const data = Buffer.from(await response.arrayBuffer());
    const previousAvatarId =
      typeof user.avatar === 'object' && user.avatar !== null ? user.avatar.id : user.avatar;
    const media = await req.payload.create({
      collection: COLLECTIONS.media,
      data: { alt: `Avatar de ${user.email}` },
      file: {
        data,
        mimetype,
        name: `google-avatar-${user.id}.${extension}`,
        size: data.byteLength,
      },
      overrideAccess: true,
      req,
    });
    await req.payload.update({
      collection: COLLECTIONS.users,
      id: user.id,
      data: { avatar: media.id },
      overrideAccess: true,
      req,
    });
    if (previousAvatarId && previousAvatarId !== media.id) {
      await req.payload.delete({
        collection: COLLECTIONS.media,
        id: previousAvatarId,
        overrideAccess: true,
        req,
      });
    }

    return { ...user, avatar: media.id };
  } catch (error) {
    req.payload.logger.warn({ err: error, userId: user.id }, 'Failed to sync Google avatar');
    return user;
  }
};

export const Users: CollectionConfig = {
  slug: COLLECTIONS.users,
  auth: {
    useAPIKey: true,
  },
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
    afterLogin: [syncGoogleAvatar],
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
      name: 'defaultOrganisation',
      type: 'relationship',
      relationTo: COLLECTIONS.organisations,
      label: 'Organisation par défaut',
      admin: {
        position: 'sidebar',
        description:
          'Charte graphique pré-sélectionnée sur les nouvelles présentations de cet utilisateur.',
      },
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
