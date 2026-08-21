import { describe, expect, it } from 'vitest';

import { ROLES } from '../../access/roles';
import { Accounts } from '../Accounts';

type TestUser = { id: string; role: string } | null;
const access = (user: TestUser) => ({ req: { user } }) as never;

describe('Accounts collection hardening', () => {
  it('is hidden from the admin navigation (technical OAuth table)', () => {
    expect(Accounts.admin?.hidden).toBe(true);
  });

  it('allows all authenticated users under the temporary admin policy', () => {
    const read = Accounts.access?.read;
    expect(read).toBeTypeOf('function');
    expect(read!(access({ id: 'a', role: ROLES.admin }))).toBe(true);
    expect(read!(access({ id: 'u', role: ROLES.author }))).toBe(true);
    expect(read!(access(null))).toBe(false);
  });
});
