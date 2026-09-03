import { describe, expect, it } from 'vitest';

import {
  getSourceReadinessLabel,
  groupSourceOptions,
  isSourceUnready,
  type BrowserSourceOption,
} from '../adminSourceOptions';

const sources: BrowserSourceOption[] = [
  { id: 'mcp-docs', label: 'Documentation web', kind: 'external' },
  { id: 'knowledge_ready', label: 'Contrats', kind: 'knowledge', readiness: 'ready' },
  { id: 'knowledge_empty', label: 'Notes', kind: 'knowledge', readiness: 'empty' },
  { id: 'knowledge_failed', label: 'Archives', kind: 'knowledge', readiness: 'failed' },
  {
    id: 'knowledge_pending',
    label: 'Import en cours',
    kind: 'knowledge',
    readiness: 'unavailable',
  },
];

describe('admin source options', () => {
  it('groups knowledge bases before external sources without changing either group order', () => {
    expect(groupSourceOptions(sources)).toEqual([
      {
        kind: 'knowledge',
        label: 'Bases de connaissances',
        sources: sources.slice(1),
      },
      {
        kind: 'external',
        label: 'Sources externes',
        sources: sources.slice(0, 1),
      },
    ]);
  });

  it('gives authors explicit readiness messages for no-content knowledge bases', () => {
    expect(getSourceReadinessLabel(sources[2])).toBe('Base vide — aucun document');
    expect(getSourceReadinessLabel(sources[3])).toBe(
      'Indisponible — tous les documents ont échoué',
    );
    expect(getSourceReadinessLabel(sources[4])).toBe('Indisponible — aucun document indexé');
    expect(getSourceReadinessLabel(sources[1])).toBeNull();
    expect(getSourceReadinessLabel(sources[0])).toBeNull();
    expect(isSourceUnready(sources[2])).toBe(true);
    expect(isSourceUnready(sources[1])).toBe(false);
  });
});
