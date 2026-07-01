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

  it('scopes non-admins to unlinked media plus their readable presentations', async () => {
    find.mockResolvedValue({ docs: [{ id: 7 }, { id: 9 }] });

    const result = await canReadMedia(accessArgs({ id: 'author', role: 'author' }));

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'presentations', overrideAccess: false }),
    );
    expect(result).toEqual({
      or: [
        { presentation: { exists: false } },
        { presentation: { equals: null } },
        { presentation: { in: [7, 9] } },
      ],
    });
  });
});
