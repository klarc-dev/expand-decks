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

    // Google hands out a 96px thumbnail (`=s96-c`); ask for 400px so the
    // portrait stays sharp on speaker cards in the exported PDF.
    const response = await fetch(account.picture.replace(/=s\d+-c$/, '=s400-c'));
    if (!response.ok) throw new Error(`Google avatar request failed (${response.status})`);

    const mimetype = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    const extension = AVATAR_MIME_EXTENSIONS[mimetype];
    if (!extension)
      throw new Error(`Unsupported Google avatar content type: ${mimetype || 'none'}`);

    const data = Buffer.from(await response.arrayBuffer());
    const previousAvatarId =
      typeof user.avatar === 'object' && user.avatar !== null ? user.avatar.id : user.avatar;
    if (previousAvatarId) {
      const previousAvatar = await req.payload.findByID({
        collection: COLLECTIONS.media,
        id: previousAvatarId,
        depth: 0,
        overrideAccess: true,
        req,
      });
      // A curated public portrait is authoritative. Google OAuth remains the
      // fallback for accounts that have no portrait or still use a synced avatar.
      if (previousAvatar.alt?.startsWith('Portrait public de ')) return user;
    }
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
    depth: 0,
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
      type: 'row',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Téléphone',
          admin: {
            description:
              'Numéro affiché sur les cartes intervenants, cliquable (tel:) dans le PDF exporté',
          },
        },
        {
          name: 'website',
          type: 'text',
          label: 'Page de profil',
          admin: {
            description:
              'URL https de la page de profil, ajoutée comme lien sur les cartes intervenants',
          },
          validate: (value: string | null | undefined) =>
            !value || /^https:\/\//.test(value)
              ? true
              : 'URL https requise (ex. https://example.com/equipe/nom)',
        },
        {
          name: 'linkedin',
          type: 'text',
          label: 'Profil LinkedIn',
          admin: {
            description: 'URL https du profil, ajoutée comme lien sur les cartes intervenants',
          },
          validate: (value: string | null | undefined) =>
            !value || /^https:\/\//.test(value)
              ? true
              : 'URL https requise (ex. https://www.linkedin.com/in/…)',
        },
      ],
    },
    {
      name: 'organisations',
      type: 'relationship',
      relationTo: COLLECTIONS.organisations,
      hasMany: true,
      label: 'Organisations',
      index: true,
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        position: 'sidebar',
        description:
          'Organisations dont ce membre fait partie. Il voit toutes les présentations de ces organisations.',
      },
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
      validate: (value: unknown, { data }: { data?: Partial<{ organisations: unknown }> }) => {
        if (!value) return true;
        const memberships = Array.isArray(data?.organisations) ? data.organisations : [];
        if (memberships.length === 0) return true;
        const id = (candidate: unknown) =>
          candidate && typeof candidate === 'object'
            ? String((candidate as { id?: unknown }).id)
            : String(candidate);
        return memberships.some((membership) => id(membership) === id(value))
          ? true
          : 'L’organisation par défaut doit faire partie des organisations du membre.';
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
      ],
    },
  ],
};
