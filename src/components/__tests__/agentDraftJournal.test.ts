import { describe, expect, it } from 'vitest';

import {
  formatDraftEventDetail,
  formatDraftEventPhase,
  formatDraftEventTime,
} from '../agentDraftJournal';

describe('formatDraftEventPhase', () => {
  it('localizes persisted lifecycle and workflow phases', () => {
    expect(formatDraftEventPhase('queued')).toBe('Dans la file d’attente…');
    expect(formatDraftEventPhase('approval')).toBe('Validation du plan requise.');
    expect(formatDraftEventPhase('cancelled')).toBe('Annulé.');
    expect(formatDraftEventPhase('validate:revise')).toBe('Correction des diapositives signalées…');
  });

  it('does not expose unknown internal identifiers', () => {
    expect(formatDraftEventPhase('internal:future-step')).toBe('Étape du workflow.');
  });
});

describe('formatDraftEventDetail', () => {
  it('formats workflow progress without exposing object syntax', () => {
    expect(formatDraftEventDetail({ phase: 'draft', detail: { completed: 2, total: 5 } })).toBe(
      '2/5 étapes terminées',
    );
  });

  it('formats revision counts with French plurality', () => {
    expect(formatDraftEventDetail({ phase: 'validate:revise', detail: { count: 1 } })).toBe(
      '1 diapositive à corriger',
    );
    expect(formatDraftEventDetail({ phase: 'visual:revise', detail: { count: 3 } })).toBe(
      '3 diapositives à corriger',
    );
  });

  it('keeps error strings readable', () => {
    expect(formatDraftEventDetail({ phase: 'failed', detail: 'Queue failed' })).toBe(
      'Queue failed',
    );
  });

  it('summarizes approval and unknown technical payloads', () => {
    expect(formatDraftEventDetail({ phase: 'approval', detail: { outline: [] } })).toBe(
      'Plan prêt pour validation.',
    );
    expect(
      formatDraftEventDetail({ phase: 'gather', detail: { sourceIds: ['private-source'] } }),
    ).toBe('Détails techniques disponibles dans le run.');
  });
});

describe('formatDraftEventTime', () => {
  it('preserves the canonical instant alongside a localized clock label', () => {
    const formatted = formatDraftEventTime(Date.UTC(2026, 8, 1, 10, 20, 30));
    expect(formatted?.dateTime).toBe('2026-09-01T10:20:30.000Z');
    expect(formatted?.label).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('rejects invalid timestamps', () => {
    expect(formatDraftEventTime(Number.NaN)).toBeNull();
    expect(formatDraftEventTime(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
