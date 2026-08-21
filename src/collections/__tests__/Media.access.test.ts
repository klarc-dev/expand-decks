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

  it('lets logged-in authors read any media under the temporary admin policy', async () => {
    await expect(canReadMedia(accessArgs({ id: 'author', role: 'author' }))).resolves.toBe(true);
    expect(find).not.toHaveBeenCalled();
  });
});
