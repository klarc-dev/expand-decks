import type { RelationshipField } from 'payload';
import { describe, expect, it } from 'vitest';

import { KnowledgeBases } from '../KnowledgeBases';

function organisationField(): RelationshipField {
  const field = KnowledgeBases.fields.find(
    (field) => 'name' in field && field.name === 'organisation',
  );
  expect(field, 'Knowledge bases must expose an organisation selector').toBeDefined();
  return field as RelationshipField;
}

const author = { id: 7, role: 'author', organisations: [11] };

describe('knowledge base organisation ownership', () => {
  it('enforces membership for creates and organisation changes server-side', async () => {
    const hook = organisationField().hooks?.beforeValidate?.[0];
    expect(hook, 'Membership validation must run before required validation').toBeTypeOf(
      'function',
    );
    const run = (value: unknown, user: unknown = author, operation = 'create') =>
      hook!({ value, req: { user }, operation } as never);
    expect(await run(undefined)).toBe(11);
    expect(await run({ id: 11 })).toEqual({ id: 11 });
    expect(await run('11')).toBe('11');
    await expect(async () => run(99)).rejects.toThrow(/organisation/i);
    await expect(async () => run(99, author, 'update')).rejects.toThrow(/organisation/i);
    await expect(async () => run(null, author, 'update')).rejects.toThrow(/organisation/i);
    await expect(async () => run(undefined, { ...author, organisations: [] })).rejects.toThrow(
      /organisation/i,
    );
    await expect(async () =>
      run(undefined, { ...author, organisations: [11, 12], defaultOrganisation: 11 }),
    ).rejects.toThrow(/organisation/i);
    expect(await run(12, { ...author, organisations: [11, 12] })).toBe(12);
    expect(await run(99, { id: 1, role: 'admin' })).toBe(99);
    expect(
      await hook!({
        value: undefined,
        operation: 'update',
        originalDoc: { organisation: 12 },
        req: { user: { ...author, organisations: [11, 12] } },
      } as never),
    ).toBe(12);
    await expect(async () => run(11, null)).rejects.toThrow(/organisation/i);
  });
  it('limits the selector to memberships while retaining the global admin exception', async () => {
    const filter = organisationField().filterOptions as (args: unknown) => unknown;
    expect(filter).toBeTypeOf('function');
    expect(await filter({ user: { ...author, organisations: [11, 12] } })).toEqual({
      id: { in: [11, 12] },
    });
    expect(await filter({ user: { ...author, organisations: [] } })).toEqual({ id: { in: [] } });
    expect(await filter({ user: { id: 1, role: 'admin' } })).toBe(true);
  });

  it('automatically selects the creator’s sole organisation in the native form', () => {
    const field = organisationField();
    expect(field).toMatchObject({
      type: 'relationship',
      relationTo: 'organisations',
      required: true,
      index: true,
    });
    const defaultValue = field.defaultValue as (args: { user: unknown }) => unknown;
    expect(defaultValue({ user: author })).toBe(11);
    expect(defaultValue({ user: { ...author, organisations: [{ id: 11 }] } })).toBe(11);
    expect(defaultValue({ user: { ...author, organisations: [], defaultOrganisation: 11 } })).toBe(
      11,
    );
    expect(defaultValue({ user: { ...author, organisations: [11, 12] } })).toBeUndefined();
    expect(defaultValue({ user: null })).toBeUndefined();
  });
});
