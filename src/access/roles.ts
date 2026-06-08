import type { Access, FieldAccess, PayloadRequest } from 'payload';

export const ROLES = { admin: 'admin', author: 'author', viewer: 'viewer' } as const;

type RoleUser = PayloadRequest['user'];

export const userIsAdmin = (u: RoleUser): boolean => u?.role === ROLES.admin;

export const userIsAdminOrAuthor = (u: RoleUser): boolean =>
  u?.role === ROLES.admin || u?.role === ROLES.author;

export const isAdmin: Access = ({ req: { user } }) =>
  user?.role === ROLES.admin;

export const isAdminOrAuthor: Access = ({ req: { user } }) =>
  user?.role === ROLES.admin || user?.role === ROLES.author;

export const isLoggedIn: Access = ({ req: { user } }) =>
  Boolean(user);

export const isAdminField: FieldAccess = ({ req: { user } }) =>
  user?.role === ROLES.admin;

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.role === ROLES.admin) return true;
  return { createdBy: { equals: user.id } };
};

// Users have no `createdBy`, so self-scoping must match on `id` — not createdBy.
export const isAdminOrSelfUser: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.role === ROLES.admin) return true;
  return { id: { equals: user.id } };
};
