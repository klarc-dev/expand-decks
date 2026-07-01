/**
 * Unit tests for outputPolicy wiring in the build runner.
 * Tests that wantsPdf/wantsSpa guards route execution correctly.
 *
 * The runner itself (runBuildSlidesTask) is integration-heavy (Payload, Slidev,
 * filesystem), so we test the policy helpers and the hook's queue input shape
 * here in isolation.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OUTPUT_POLICY,
  normalizeOutputPolicy,
  wantsPdf,
  wantsSpa,
} from '../../lib/outputPolicy';

describe('outputPolicy integration contract', () => {
  it('hook queues both by default', () => {
    // afterPresentationChange passes DEFAULT_OUTPUT_POLICY — ensure it's 'both'
    // so that normal publish/update builds always produce PDF + SPA.
    expect(DEFAULT_OUTPUT_POLICY).toBe('both');
    expect(wantsPdf(DEFAULT_OUTPUT_POLICY)).toBe(true);
    expect(wantsSpa(DEFAULT_OUTPUT_POLICY)).toBe(true);
  });

  it('pdf policy skips SPA', () => {
    const p = normalizeOutputPolicy('pdf');
    expect(wantsPdf(p)).toBe(true);
    expect(wantsSpa(p)).toBe(false);
  });

  it('spa policy skips PDF', () => {
    const p = normalizeOutputPolicy('spa');
    expect(wantsPdf(p)).toBe(false);
    expect(wantsSpa(p)).toBe(true);
  });

  it('both policy produces both artifacts', () => {
    const p = normalizeOutputPolicy('both');
    expect(wantsPdf(p)).toBe(true);
    expect(wantsSpa(p)).toBe(true);
  });

  it('unknown/missing input from job queue falls back to both', () => {
    // Older queued jobs (before this change) will have no outputPolicy field.
    // The runner must default to 'both' (backward-compatible).
    expect(normalizeOutputPolicy(undefined)).toBe('both');
    expect(normalizeOutputPolicy(null)).toBe('both');
    expect(normalizeOutputPolicy('')).toBe('both');
    expect(normalizeOutputPolicy('all')).toBe('both');
  });

  it('parallel task array has correct length per policy', () => {
    // Simulate the runner's task-gating logic without importing the runner.
    function taskCount(policy: string): number {
      const p = normalizeOutputPolicy(policy);
      let count = 0;
      if (wantsSpa(p)) count += 1;
      if (wantsPdf(p)) count += 1;
      return count;
    }

    expect(taskCount('both')).toBe(2);
    expect(taskCount('pdf')).toBe(1);
    expect(taskCount('spa')).toBe(1);
    expect(taskCount('unknown')).toBe(2); // fallback to both
  });
});
