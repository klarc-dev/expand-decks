import { describe, expect, it } from 'vitest';

import { Presentations } from '../Presentations';

function findField(name: string): Record<string, unknown> | undefined {
  // Recursive test-only schema lookup is intentionally compact.
  // fallow-ignore-next-line complexity
  const visit = (fields: unknown[]): Record<string, unknown> | undefined => {
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue;
      const record = field as Record<string, unknown>;
      if (record.name === name) return record;

      const nestedFields = record.fields;
      if (Array.isArray(nestedFields)) {
        const found = visit(nestedFields);
        if (found) return found;
      }

      const tabs = record.tabs;
      if (Array.isArray(tabs)) {
        const tabFields = tabs.flatMap((tab) => {
          if (!tab || typeof tab !== 'object') return [];
          const fields = (tab as Record<string, unknown>).fields;
          return Array.isArray(fields) ? fields : [];
        });
        const found = visit(tabFields);
        if (found) return found;
      }
    }
    return undefined;
  };

  return visit(Presentations.fields as unknown[]);
}

describe('Presentations AI brief persistence', () => {
  it('stores the editable brief on the presentation document', () => {
    expect(findField('agentBrief')).toMatchObject({
      type: 'textarea',
      label: 'Brief de la présentation',
    });
  });
});
