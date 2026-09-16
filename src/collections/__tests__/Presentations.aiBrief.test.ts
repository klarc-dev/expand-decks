import { describe, expect, it } from 'vitest';

import { MIN_BRIEF_CHARS } from '../../lib/draftConfig';
import { Presentations } from '../Presentations';

function hasFieldOfType(type: string, label: string): boolean {
  const visit = (fields: unknown[]): boolean =>
    fields.some((field) => {
      if (!field || typeof field !== 'object') return false;
      const record = field as Record<string, unknown>;
      if (record.type === type && record.label === label) return true;
      const nested = [
        ...(Array.isArray(record.fields) ? record.fields : []),
        ...(Array.isArray(record.tabs)
          ? record.tabs.flatMap((tab) => {
              const tabFields = (tab as Record<string, unknown>)?.fields;
              return Array.isArray(tabFields) ? tabFields : [];
            })
          : []),
      ];
      return visit(nested);
    });
  return visit(Presentations.fields as unknown[]);
}

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

describe('Presentations IA tab', () => {
  it('keeps a base that drifted off ready selectable so the document stays saveable', () => {
    const filter = findField('agentKnowledgeBases')!.filterOptions as (args: unknown) => unknown;
    const ready = { readiness: { equals: 'ready' } };
    expect(filter({ data: {} })).toEqual(ready);
    expect(filter({ data: { agentKnowledgeBases: [] } })).toEqual(ready);
    expect(
      filter({
        data: {
          agentKnowledgeBases: [4, { id: 5 }, { relationTo: 'knowledge-bases', value: 6 }, null],
        },
      }),
    ).toEqual({ or: [ready, { id: { in: [4, 5, 6] } }] });
  });

  it('locks the run pointers against admin and REST saves', () => {
    for (const name of ['draftStatus', 'draftRunId']) {
      const access = findField(name)?.access as { update: () => boolean } | undefined;
      expect(access?.update(), `${name} must be run-owned`).toBe(false);
    }
  });

  it('requires a brief the start request would accept', () => {
    expect(findField('agentBrief')).toMatchObject({ minLength: MIN_BRIEF_CHARS });
  });

  it('exposes the brief and the run options as native fields', () => {
    expect(findField('agentBrief')).toMatchObject({
      type: 'textarea',
      label: 'Brief',
      admin: { rows: 5 },
    });
    expect(findField('agentMode')).toMatchObject({ type: 'radio' });
    expect(findField('agentKnowledgeBases')).toMatchObject({
      type: 'relationship',
      hasMany: true,
    });
    expect(hasFieldOfType('collapsible', 'Options avancées')).toBe(false);
    expect(findField('agentModel')).toMatchObject({ type: 'text', admin: { hidden: true } });
    expect(findField('agentVisualCritique')).toMatchObject({ type: 'checkbox' });
    expect(findField('agentApprovalRequired')).toMatchObject({ type: 'checkbox' });
    expect(findField('agentRun')).toMatchObject({ type: 'ui' });
  });

  it('keeps run state read-only in the sidebar and drops the mirrored ledgers', () => {
    expect(findField('draftStatus')).toMatchObject({
      admin: { readOnly: true, position: 'sidebar' },
    });
    expect(findField('latestAgentRun')).toBeUndefined();
    expect(findField('draftRequestId')).toBeUndefined();
    for (const removed of ['draftEvents', 'draftSources', 'draftEvidence']) {
      expect(findField(removed)).toBeUndefined();
    }
  });
});
