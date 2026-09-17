import type { Config } from 'payload';
import { describe, expect, it } from 'vitest';

import { fieldDescriptionTooltips } from '../fieldDescriptionTooltips';

const DESCRIPTION_COMPONENT = '/components/FieldTooltipDescription#default';

describe('fieldDescriptionTooltips', () => {
  it('adds the tooltip description component recursively without replacing overrides', async () => {
    const existing = '/components/ExistingDescription#default';
    const plugin = fieldDescriptionTooltips();
    const configured = await plugin({
      collections: [
        {
          slug: 'examples',
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: { description: 'Titre public' },
            },
            {
              name: 'group',
              type: 'group',
              fields: [
                {
                  name: 'nested',
                  type: 'text',
                  admin: { description: 'Aide imbriquée' },
                },
              ],
            },
            {
              name: 'custom',
              type: 'text',
              admin: {
                description: 'Description personnalisée',
                components: { Description: existing },
              },
            },
            { name: 'plain', type: 'text' },
          ],
        },
      ],
    } as Config);

    const fields = configured.collections?.[0]?.fields ?? [];
    expect(fields[0]).toMatchObject({
      admin: { components: { Description: DESCRIPTION_COMPONENT } },
    });
    const group = fields[1];
    const nestedFields = group && 'fields' in group ? group.fields : [];
    expect(nestedFields[0]).toMatchObject({
      admin: { components: { Description: DESCRIPTION_COMPONENT } },
    });
    expect(fields[2]).toMatchObject({ admin: { components: { Description: existing } } });
    expect(fields[3]).not.toHaveProperty('admin.components.Description');
  });
});
