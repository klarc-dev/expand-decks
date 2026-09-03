import type { Access, FieldAccess, PayloadRequest, Where } from 'payload';

export const ROLES = { admin: 'admin', author: 'author', viewer: 'viewer' } as const;

type RoleUser = PayloadRequest['user'];

/** Narrow a relationship value (bare id or populated doc) to its id. */
const relationshipId = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return id;
  }
  return undefined;
};

/**
 * Organisations this user belongs to. `req.user` carries relationships at the
 * auth depth, so entries may be bare ids or populated docs; both are accepted.
 * `defaultOrganisation` is folded in so a user is never locked out of the org
 * pre-selected on their own new decks.
 */
export const userOrganisationIds = (u: RoleUser): (string | number)[] => {
  const record = u as { organisations?: unknown; defaultOrganisation?: unknown } | null | undefined;
  if (!record) return [];
  const raw = Array.isArray(record.organisations) ? record.organisations : [];
  const ids = [...raw, record.defaultOrganisation]
    .map(relationshipId)
    .filter((id): id is string | number => id !== undefined);
  return [...new Set(ids)];
};

export const userIsAdmin = (u: RoleUser): boolean => u?.role === ROLES.admin;

export const userIsAdminOrAuthor = (u: RoleUser): boolean =>
  u?.role === ROLES.admin || u?.role === ROLES.author;

/** True when the user may act on documents belonging to `organisationId`. */
export const userIsOrganisationMember = (u: RoleUser, organisationId: unknown): boolean => {
  if (!u) return false;
  if (userIsAdmin(u)) return true;
  const id = relationshipId(organisationId);
  if (id === undefined) return false;
  return userOrganisationIds(u).some((candidate) => String(candidate) === String(id));
};

export const isAdmin: Access = ({ req: { user } }) => userIsAdmin(user);

export const isAdminOrAuthor: Access = ({ req: { user } }) => userIsAdminOrAuthor(user);

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user);

export const isAdminField: FieldAccess = ({ req: { user } }) => userIsAdmin(user);

/**
 * Org-scoped read/write for documents carrying an `organisation` relationship.
 * Admins are unrestricted; everyone else is narrowed to their organisations by
 * a query constraint, so list views, REST, GraphQL and the admin panel are all
 * filtered from one place. A user with no organisation sees nothing.
 */
export const isOrganisationMember: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (userIsAdmin(user)) return true;
  const ids = userOrganisationIds(user);
  if (ids.length === 0) return false;
  return { organisation: { in: ids } } satisfies Where;
};

/** Same policy applied to the Organisations collection itself (scoped on `id`). */
export const isOwnOrganisation: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (userIsAdmin(user)) return true;
  const ids = userOrganisationIds(user);
  if (ids.length === 0) return false;
  return { id: { in: ids } } satisfies Where;
};

// Users have no `organisation`; self-scoping matches on `id`.
export const isAdminOrSelfUser: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (userIsAdmin(user)) return true;
  return { id: { equals: user.id } } satisfies Where;
};
