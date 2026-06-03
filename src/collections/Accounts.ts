import { withAccountCollection } from 'payload-auth-plugin/collection';

import { isAdmin, isLoggedIn } from '../access/roles';

export const Accounts = withAccountCollection(
  {
    slug: 'accounts',
    labels: { singular: 'Compte lié', plural: 'Comptes liés' },
    access: {
      read: isLoggedIn,
      delete: isAdmin,
    },
  },
  'users',
);
