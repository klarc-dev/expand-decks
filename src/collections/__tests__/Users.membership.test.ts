import { readFileSync } from 'node:fs';

import { AuthenticationError } from 'payload';
import { describe, expect, it, vi } from 'vitest';

import { Users } from '../Users';

type MembershipStatus = 'pending' | 'active' | 'rejected';

const beforeLogin = Users.hooks?.beforeLogin?.[0];
const afterLogin = Users.hooks?.afterLogin?.[0];

async function runBeforeLogin(membershipStatus?: MembershipStatus) {
  if (!beforeLogin) throw new Error('Users.beforeLogin is not configured');
  const user = { id: 1, email: 'member@example.com', membershipStatus };
  return beforeLogin({ user } as Parameters<typeof beforeLogin>[0]);
}

describe('Users membership approval', () => {
  it('allows active and pre-migration users to authenticate', async () => {
    await expect(runBeforeLogin('active')).resolves.toMatchObject({ membershipStatus: 'active' });
    await expect(runBeforeLogin()).resolves.toMatchObject({ email: 'member@example.com' });
  });

  it.each(['pending', 'rejected'] as const)(
    'denies %s users before token issuance',
    async (status) => {
      await expect(runBeforeLogin(status)).rejects.toBeInstanceOf(AuthenticationError);
    },
  );

  it('defaults normal admin-created users to active', () => {
    const field = Users.fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'membershipStatus',
    );
    expect(field).toMatchObject({
      type: 'select',
      required: true,
      defaultValue: 'active',
    });
  });
});

describe('Users native API keys', () => {
  it('uses Payload authentication so a generated key is shown and can authenticate requests', () => {
    expect(Users.auth).toMatchObject({ useAPIKey: true });
  });
});

describe('Users profile defaults', () => {
  it('exposes a default organisation relationship in the sidebar', () => {
    const field = Users.fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'defaultOrganisation',
    );
    expect(field).toMatchObject({
      type: 'relationship',
      relationTo: 'organisations',
      admin: { position: 'sidebar' },
    });
  });
});

describe('Users Google avatar synchronization', () => {
  it('retrieves the linked Google picture and assigns the uploaded media on login', async () => {
    if (!afterLogin) throw new Error('Users.afterLogin is not configured');

    const find = vi.fn().mockResolvedValue({
      docs: [{ issuerName: 'https://accounts.google.com', picture: 'https://google/avatar.jpg' }],
    });
    const create = vi.fn().mockResolvedValue({ id: 42 });
    const update = vi.fn().mockResolvedValue({ id: 7, avatar: 42 });
    const fetchImage = vi.fn().mockResolvedValue(
      new Response(Uint8Array.from([1, 2, 3]), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    vi.stubGlobal('fetch', fetchImage);

    const user = { id: 7, email: 'member@example.com', membershipStatus: 'active' };
    const result = await afterLogin({
      user,
      token: 'token',
      req: { payload: { find, create, update, logger: { warn: vi.fn() } } },
    } as unknown as Parameters<typeof afterLogin>[0]);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'accounts',
        where: {
          and: [
            { user: { equals: 7 } },
            { issuerName: { equals: 'https://accounts.google.com' } },
            { picture: { exists: true } },
          ],
        },
      }),
    );
    expect(fetchImage).toHaveBeenCalledWith('https://google/avatar.jpg');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        data: { alt: 'Avatar de member@example.com' },
        file: expect.objectContaining({ mimetype: 'image/jpeg', name: 'google-avatar-7.jpg' }),
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', id: 7, data: { avatar: 42 } }),
    );
    expect(result).toMatchObject({ avatar: 42 });

    vi.unstubAllGlobals();
  });
});

describe('patched OAuth auto-signup contract', () => {
  it('creates pending users and redirects them before JWT or cookie generation', () => {
    const pluginEntry = new URL(
      '../../../node_modules/payload-auth-plugin/dist/esm/index.js',
      import.meta.url,
    );
    const runtime = readFileSync(pluginEntry, 'utf8');

    const pendingCreate = runtime.indexOf('membershipStatus: "pending"');
    const pendingGate = runtime.indexOf('membershipStatus && membershipStatus !== "active"');
    const jwt = runtime.indexOf('await jwtSign', pendingGate);
    const cookie = runtime.indexOf('generatePayloadCookie({', pendingGate);

    expect(pendingCreate).toBeGreaterThan(-1);
    expect(pendingGate).toBeGreaterThan(pendingCreate);
    expect(jwt).toBeGreaterThan(pendingGate);
    expect(cookie).toBeGreaterThan(jwt);

    const gateBody = runtime.slice(pendingGate, jwt);
    expect(gateBody).toContain('commitTransaction');
    expect(gateBody).toContain('status: 302');
    expect(gateBody).toContain('headers: { Location: pendingURL.href }');
    expect(gateBody).not.toContain('Set-Cookie');
  });
});
