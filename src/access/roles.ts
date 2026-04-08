import type { Access, FieldAccess } from 'payload';

export const isAdmin: Access = ({ req: { user } }) =>
  user?.role === 'admin';

export const isAdminOrAuthor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'author';

export const isLoggedIn: Access = ({ req: { user } }) =>
  Boolean(user);

export const isAdminField: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin';

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return { createdBy: { equals: user.id } };
};
