import { describe, expect, it } from 'vitest';

import { Presentations } from '../../collections/Presentations';
import { isAdmin, isAdminOrSelf, isLoggedIn, ROLES } from '../roles';

// Payload Access fns only ever read `req.user`. We hand them a minimal request
// shaped like the real one; casting the arg keeps the call site honest about
// what these functions actually touch without dragging in the full Payload
// request type. The security contract these tests pin:
//   create / read  -> any logged-in user
//   update         -> admin (true) OR owner-scoped Where { createdBy: id }
//   delete         -> admin only
type TestUser = { id: string; role: (typeof ROLES)[keyof typeof ROLES] } | null | undefined;

const access = (user: TestUser) =>
  ({ req: { user } }) as unknown as Parameters<typeof isLoggedIn>[0];

const admin: TestUser = { id: 'a1', role: ROLES.admin };
const author: TestUser = { id: 'u1', role: ROLES.author };

describe('isLoggedIn — gates create + read', () => {
  it('returns true for a logged-in non-admin (author CAN create)', () => {
    expect(isLoggedIn(access(author))).toBe(true);
  });

  it('returns false for a null user', () => {
    expect(isLoggedIn(access(null))).toBe(false);
  });

  it('returns false for an undefined user', () => {
    expect(isLoggedIn(access(undefined))).toBe(false);
  });
});

describe('isAdminOrSelf — gates update', () => {
  it('scopes a logged-in non-admin to rows they own', () => {
    expect(isAdminOrSelf(access(author))).toEqual({ createdBy: { equals: 'u1' } });
  });

  it('returns true (unrestricted) for an admin', () => {
    expect(isAdminOrSelf(access(admin))).toBe(true);
  });

  it('returns false for no user', () => {
    expect(isAdminOrSelf(access(null))).toBe(false);
  });
});

describe('isAdmin — gates delete', () => {
  it('returns true for an admin', () => {
    expect(isAdmin(access(admin))).toBe(true);
  });

  it('returns false for a non-admin author', () => {
    expect(isAdmin(access(author))).toBe(false);
  });

  it('is falsy for no user', () => {
    expect(isAdmin(access(null))).toBeFalsy();
  });
});

// Regression guard: pin the Presentations collection to the exact access fns.
// Reference-equality catches any future flip (e.g. someone swapping create
// back to isAdminOrAuthor, or loosening delete off isAdmin).
describe('Presentations.access — wiring lock', () => {
  it('create is gated by isLoggedIn', () => {
    expect(Presentations.access?.create).toBe(isLoggedIn);
  });

  it('read is gated by isLoggedIn', () => {
    expect(Presentations.access?.read).toBe(isLoggedIn);
  });

  it('update is gated by isAdminOrSelf', () => {
    expect(Presentations.access?.update).toBe(isAdminOrSelf);
  });

  it('delete is gated by isAdmin', () => {
    expect(Presentations.access?.delete).toBe(isAdmin);
  });
});
