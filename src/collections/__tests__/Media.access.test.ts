import { beforeEach, describe, expect, it, vi } from 'vitest';

import { canReadMedia } from '../Media';

const find = vi.fn();

function accessArgs(user: unknown) {
  return { req: { user, payload: { find } } } as never;
}

describe('Media access', () => {
  beforeEach(() => {
    find.mockReset();
  });

  it('lets admins read any media without scoping', async () => {
    await expect(canReadMedia(accessArgs({ id: 'admin', role: 'admin' }))).resolves.toBe(true);
    expect(find).not.toHaveBeenCalled();
  });

  it('denies anonymous access', async () => {
    await expect(canReadMedia(accessArgs(null))).resolves.toBe(false);
  });

  it('scopes a non-admin to media attached to presentations they can read', async () => {
    find.mockResolvedValue({ docs: [{ id: 1 }, { id: 4 }] });

    await expect(canReadMedia(accessArgs({ id: 'author', role: 'author' }))).resolves.toEqual({
      or: [
        { presentation: { exists: false } },
        { presentation: { equals: null } },
        { presentation: { in: [1, 4] } },
      ],
    });
    // Delegates to the Presentations read policy rather than re-deriving org
    // membership, so media scoping follows deck scoping automatically.
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'presentations', overrideAccess: false }),
    );
  });
});
