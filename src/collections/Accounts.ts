import { withAccountCollection } from 'payload-auth-plugin/collection';

import { isAdmin } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

export const Accounts = withAccountCollection(
  {
    slug: COLLECTIONS.accounts,
    labels: { singular: 'Compte lié', plural: 'Comptes liés' },
    // Table technique du plugin OAuth (liens compte ↔ user, jetons) : elle ne
    // porte aucun contenu éditorial, donc hors de la navigation admin. Les URLs
    // directes restent accessibles pour le debug.
    admin: { hidden: true },
    access: {
      // Les lignes contiennent des access/refresh tokens en clair : lecture
      // réservée aux admins. Le plugin écrit via payload.db (bypass access).
      read: isAdmin,
      delete: isAdmin,
    },
  },
  COLLECTIONS.users,
);
