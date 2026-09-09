import { describe, expect, it, vi } from 'vitest';

import { canCreateMedia, canReadMedia } from '../Media';

const find = vi.fn();

function accessArgs(user: unknown) {
  return { req: { user, payload: { find } } } as never;
}

describe('Media access', () => {
  it('allows media creation for admins and authors but not viewers or anonymous users', () => {
    expect(canCreateMedia(accessArgs({ id: 'admin', role: 'admin' }))).toBe(true);
    expect(canCreateMedia(accessArgs({ id: 'author', role: 'author' }))).toBe(true);
    expect(canCreateMedia(accessArgs({ id: 'viewer', role: 'viewer' }))).toBe(false);
    expect(canCreateMedia(accessArgs(null))).toBe(false);
  });

  it('lets admins read any media without scoping', async () => {
    await expect(canReadMedia(accessArgs({ id: 'admin', role: 'admin' }))).resolves.toBe(true);
    expect(find).not.toHaveBeenCalled();
  });

  it('denies anonymous access', async () => {
    await expect(canReadMedia(accessArgs(null))).resolves.toBe(false);
  });

  it('returns a relationship constraint without recursively querying presentations', async () => {
    await expect(
      canReadMedia(
        accessArgs({ id: 'author', role: 'author', organisations: [7], defaultOrganisation: 9 }),
      ),
    ).resolves.toEqual({
      or: [
        { presentation: { exists: false } },
        { presentation: { equals: null } },
        { 'presentation.organisation': { in: [7, 9] } },
      ],
    });
    expect(find).not.toHaveBeenCalled();
  });
});
