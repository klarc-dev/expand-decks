import { describe, expect, it } from 'vitest';

import { reconcileRunState } from '../runState';

describe('reconcileRunState', () => {
  it('keeps polling while the mirror is active and the durable run is still running', () => {
    expect(reconcileRunState('drafting', 'running')).toBe('active');
    expect(reconcileRunState('gathering', 'pending')).toBe('active');
  });

  it('reports done when the mirror reached done', () => {
    expect(reconcileRunState('done', 'success')).toBe('done');
    expect(reconcileRunState('done', undefined)).toBe('done');
  });

  it('reports failed when the mirror reached failed', () => {
    expect(reconcileRunState('failed', 'running')).toBe('failed');
  });

  it('detects a dead run: mirror stuck active but durable run terminally failed', () => {
    expect(reconcileRunState('drafting', 'failed')).toBe('failed');
    expect(reconcileRunState('building', 'canceled')).toBe('failed');
    expect(reconcileRunState('validating', 'tripwire')).toBe('failed');
    expect(reconcileRunState('structuring', 'bailed')).toBe('failed');
  });

  it('detects a dead run: mirror stuck active but durable run already succeeded', () => {
    // The persist step finished the run but the final status mirror write was
    // lost (process recycle) — the durable success is authoritative.
    expect(reconcileRunState('building', 'success')).toBe('done');
  });

  it('stays active when no durable status is known yet (run handle not persisted)', () => {
    expect(reconcileRunState('drafting', undefined)).toBe('active');
    expect(reconcileRunState('drafting', 'not-found')).toBe('active');
  });

  it('treats idle mirror as idle regardless of durable status', () => {
    expect(reconcileRunState('idle', undefined)).toBe('idle');
  });
});
