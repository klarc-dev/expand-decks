import { readFileSync } from 'node:fs';

import { AuthenticationError } from 'payload';
import { describe, expect, it } from 'vitest';

import { Users } from '../Users';

type MembershipStatus = 'pending' | 'active' | 'rejected';

const beforeLogin = Users.hooks?.beforeLogin?.[0];

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
