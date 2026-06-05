import { withAccountCollection } from 'payload-auth-plugin/collection';

import { isAdmin, isLoggedIn } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';

export const Accounts = withAccountCollection(
  {
    slug: COLLECTIONS.accounts,
    labels: { singular: 'Compte lié', plural: 'Comptes liés' },
    access: {
      read: isLoggedIn,
      delete: isAdmin,
    },
  },
  COLLECTIONS.users,
);
