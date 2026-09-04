import { describe, expect, it, vi } from 'vitest';

import { canReadMedia } from '../Media';

const find = vi.fn();

function accessArgs(user: unknown) {
  return { req: { user, payload: { find } } } as never;
}

describe('Media access', () => {
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
