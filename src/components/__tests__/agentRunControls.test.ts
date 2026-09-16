import { describe, expect, it, vi } from 'vitest';

vi.mock('@payloadcms/ui', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));

import {
  approvalOutline,
  canRestartRun,
  slideCountRangeFromFields,
  sourceIdsFromFields,
  startLabelForMode,
} from '../AgentRunControls';

describe('agent run controls', () => {
  it('leaves both empty bounds automatic and accepts inclusive limits', () => {
    expect(slideCountRangeFromFields(undefined, undefined)).toEqual({});
    expect(slideCountRangeFromFields(null, null)).toEqual({});
    for (const [min, max] of [
      [3, 40],
      [3, 3],
      [40, 40],
      [10, 15],
    ]) {
      expect(slideCountRangeFromFields(min, max)).toEqual({ range: { min, max } });
    }
  });

  it('asks for both bounds when only one is filled', () => {
    for (const [min, max] of [
      [3, null],
      [null, 40],
      [undefined, 10],
      [10, undefined],
      [NaN, 10],
    ]) {
      expect(slideCountRangeFromFields(min, max).error).toBe(
        'Renseignez les deux bornes ou aucune.',
      );
    }
  });

  it('rejects an inverted range and out-of-schema bounds with French copy', () => {
    expect(slideCountRangeFromFields(10, 9).error).toBe(
      'Le maximum doit être supérieur ou égal au minimum.',
    );
    for (const [min, max] of [
      [2, 10],
      [3, 41],
      [0, 10],
      [3.5, 10],
      [3, 10.5],
    ]) {
      const { error, range } = slideCountRangeFromFields(min, max);
      expect(range).toBeUndefined();
      expect(error).toBe('Renseignez des entiers entre 3 et 40.');
    }
  });

  it('reads the persisted approval outline without accepting Mastra paths or malformed items', () => {
    const outline = [{ title: 'Décider', intent: 'Comparer les options' }];
    expect(approvalOutline({ reason: 'approval', outline })).toEqual(outline);
    for (const value of [
      null,
      [['approval']],
      { outline: [] },
      { outline: [null] },
      { outline: [{ title: 'Only title' }] },
    ]) {
      expect(approvalOutline(value)).toEqual([]);
    }
  });

  it('prefixes selected knowledge-base ids', () => {
    expect(sourceIdsFromFields([7, '9'])).toEqual(['knowledge_7', 'knowledge_9']);
    expect(sourceIdsFromFields([{ relationTo: 'knowledge-bases', value: 4 }])).toEqual([
      'knowledge_4',
    ]);
    expect(sourceIdsFromFields(null)).toEqual([]);
    expect(sourceIdsFromFields([null, {}])).toEqual([]);
  });

  it('only uses the ledger restart command for stale runs', () => {
    expect(canRestartRun('stale')).toBe(true);
    for (const status of ['failed', 'canceled', 'succeeded', 'queued', 'running', 'suspended']) {
      expect(canRestartRun(status), status).toBe(false);
    }
  });

  it('names the start action after the run mode', () => {
    expect(startLabelForMode('replace')).toBe('Générer la présentation');
    expect(startLabelForMode('revise')).toBe('Réviser la présentation');
    expect(startLabelForMode('augment')).toBe('Ajouter des slides');
    expect(startLabelForMode(undefined)).toBe('Générer la présentation');
    expect(startLabelForMode('unknown')).toBe('Générer la présentation');
  });
});
