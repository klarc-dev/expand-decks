import { describe, expect, it } from 'vitest';

import { Presentations } from '../Presentations';

function findNamedField(name: string) {
  for (const field of Presentations.fields) {
    if ('name' in field && field.name === name) return field;
    if ('fields' in field && Array.isArray(field.fields)) {
      const nested = field.fields.find(
        (candidate) => 'name' in candidate && candidate.name === name,
      );
      if (nested) return nested;
    }
  }
  return undefined;
}

describe('Presentations title and organisation row', () => {
  it('renders organisation inline with title and defaults it from the user profile', () => {
    const firstField = Presentations.fields[0];
    expect(firstField).toMatchObject({ type: 'row' });
    if (!firstField || !('fields' in firstField) || !Array.isArray(firstField.fields)) {
      throw new Error('Expected the first presentation field to be a row');
    }

    expect(firstField.fields.map((field) => ('name' in field ? field.name : undefined))).toEqual([
      'title',
      'organisation',
    ]);

    const organisation = findNamedField('organisation');
    expect(organisation).toMatchObject({
      type: 'relationship',
      required: true,
      relationTo: 'organisations',
    });
    if (!organisation || !('defaultValue' in organisation)) {
      throw new Error('Organisation field has no defaultValue');
    }

    const defaultValue = organisation.defaultValue as (args: { user: unknown }) => unknown;
    expect(defaultValue({ user: { defaultOrganisation: 7 } })).toBe(7);
    expect(defaultValue({ user: { defaultOrganisation: { id: 8, name: 'Klarc' } } })).toBe(8);
    expect(defaultValue({ user: null })).toBeUndefined();
  });
});
