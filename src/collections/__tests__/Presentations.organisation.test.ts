import { describe, expect, it } from 'vitest';

import { Presentations } from '../Presentations';

import type { Field } from 'payload';

/** Depth-first lookup through rows, groups and tabs. */
function findNamedField(name: string, fields: Field[] = Presentations.fields): Field | undefined {
  for (const field of fields) {
    if ('name' in field && field.name === name) return field;
    if ('fields' in field && Array.isArray(field.fields)) {
      const nested = findNamedField(name, field.fields);
      if (nested) return nested;
    }
    if ('tabs' in field) {
      for (const tab of field.tabs) {
        const nested = findNamedField(name, tab.fields);
        if (nested) return nested;
      }
    }
  }
  return undefined;
}

describe('Presentations title and organisation', () => {
  it('edits the title in place as the heading and keeps organisation in the settings tab', () => {
    const firstField = Presentations.fields[0];
    expect(firstField).toMatchObject({
      name: 'title',
      type: 'text',
      admin: { components: { Field: '/components/TitleField#default' } },
    });

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
