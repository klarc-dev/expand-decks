import { describe, expect, it } from 'vitest';

import { Presentations } from '../../collections/Presentations';
import {
  ROLES,
  isAdmin,
  isAdminOrAuthor,
  isLoggedIn,
  isOrganisationMember,
  isOwnOrganisation,
  userIsOrganisationMember,
  userOrganisationIds,
} from '../roles';

// Payload Access fns only ever read `req.user`. We hand them a minimal request
// shaped like the real one; casting the arg keeps the call site honest about
// what these functions actually touch without dragging in the full Payload
// request type.
type TestUser =
  | {
      id: string;
      role: (typeof ROLES)[keyof typeof ROLES];
      organisations?: unknown[];
      defaultOrganisation?: unknown;
    }
  | null
  | undefined;

const access = (user: TestUser) =>
  ({ req: { user } }) as unknown as Parameters<typeof isLoggedIn>[0];

const admin: TestUser = { id: 'a1', role: ROLES.admin };
const author: TestUser = { id: 'u1', role: ROLES.author, organisations: [7, 9] };
const orphan: TestUser = { id: 'u2', role: ROLES.author };

describe('userOrganisationIds', () => {
  it('accepts bare ids and populated docs, and folds in defaultOrganisation', () => {
    expect(
      userOrganisationIds({
        id: 'u1',
        role: ROLES.author,
        organisations: [7, { id: 9, name: 'Klarc' }],
        defaultOrganisation: { id: 11 },
      } as never),
    ).toEqual([7, 9, 11]);
  });

  it('deduplicates a defaultOrganisation already present in the membership list', () => {
    expect(
      userOrganisationIds({
        id: 'u1',
        role: ROLES.author,
        organisations: [7],
        defaultOrganisation: 7,
      } as never),
    ).toEqual([7]);
  });

  it('returns an empty list for a user with no organisations', () => {
    expect(userOrganisationIds(orphan as never)).toEqual([]);
    expect(userOrganisationIds(null)).toEqual([]);
  });
});

describe('isAdmin — gates delete', () => {
  it('is true only for the admin role', () => {
    expect(isAdmin(access(admin))).toBe(true);
    expect(isAdmin(access(author))).toBe(false);
    expect(isAdmin(access(null))).toBe(false);
  });
});

describe('isAdminOrAuthor — gates create', () => {
  it('admits admins and authors, rejects viewers and anonymous', () => {
    expect(isAdminOrAuthor(access(admin))).toBe(true);
    expect(isAdminOrAuthor(access(author))).toBe(true);
    expect(isAdminOrAuthor(access({ id: 'v1', role: ROLES.viewer }))).toBe(false);
    expect(isAdminOrAuthor(access(null))).toBe(false);
  });
});

describe('isOrganisationMember — gates presentation read/update', () => {
  it('leaves admins unrestricted', () => {
    expect(isOrganisationMember(access(admin))).toBe(true);
  });

  it('narrows a member to a query constraint over their organisations', () => {
    expect(isOrganisationMember(access(author))).toEqual({ organisation: { in: [7, 9] } });
  });

  it('denies a user with no organisation rather than showing everything', () => {
    expect(isOrganisationMember(access(orphan))).toBe(false);
  });

  it('denies anonymous requests', () => {
    expect(isOrganisationMember(access(null))).toBe(false);
  });
});

describe('isOwnOrganisation — gates the organisations collection', () => {
  it('scopes non-admins on id', () => {
    expect(isOwnOrganisation(access(author))).toEqual({ id: { in: [7, 9] } });
    expect(isOwnOrganisation(access(admin))).toBe(true);
    expect(isOwnOrganisation(access(orphan))).toBe(false);
  });
});

describe('userIsOrganisationMember — imperative guard for custom endpoints', () => {
  it('matches ids across string/number and populated shapes', () => {
    expect(userIsOrganisationMember(author as never, 7)).toBe(true);
    expect(userIsOrganisationMember(author as never, '9')).toBe(true);
    expect(userIsOrganisationMember(author as never, { id: 9 })).toBe(true);
    expect(userIsOrganisationMember(author as never, 42)).toBe(false);
  });

  it('lets admins through regardless of organisation, including a missing one', () => {
    expect(userIsOrganisationMember(admin as never, 42)).toBe(true);
    expect(userIsOrganisationMember(admin as never, undefined)).toBe(true);
  });

  it('rejects a member when the document carries no organisation', () => {
    expect(userIsOrganisationMember(author as never, undefined)).toBe(false);
    expect(userIsOrganisationMember(null, 7)).toBe(false);
  });
});

// Regression guard: pin the Presentations collection to the exact access fns.
// Reference-equality catches any future flip (e.g. someone loosening read off
// the org-scoped policy).
describe('Presentations.access — wiring lock', () => {
  it('create is gated by isAdminOrAuthor', () => {
    expect(Presentations.access?.create).toBe(isAdminOrAuthor);
  });

  it('read is gated by isOrganisationMember', () => {
    expect(Presentations.access?.read).toBe(isOrganisationMember);
  });

  it('update is gated by isOrganisationMember', () => {
    expect(Presentations.access?.update).toBe(isOrganisationMember);
  });

  it('delete is gated by isAdmin', () => {
    expect(Presentations.access?.delete).toBe(isAdmin);
  });
});
