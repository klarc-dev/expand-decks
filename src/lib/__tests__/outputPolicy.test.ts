import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OUTPUT_POLICY,
  normalizeOutputPolicy,
  OUTPUT_POLICIES,
  wantsPdf,
  wantsSpa,
} from '../outputPolicy';

describe('OUTPUT_POLICIES', () => {
  it('contains both, pdf, spa', () => {
    expect(OUTPUT_POLICIES).toEqual(['both', 'pdf', 'spa']);
  });
});

describe('DEFAULT_OUTPUT_POLICY', () => {
  it('is both', () => {
    expect(DEFAULT_OUTPUT_POLICY).toBe('both');
  });
});

describe('normalizeOutputPolicy', () => {
  it.each(['both', 'pdf', 'spa'] as const)('passes through valid policy %s', (p) => {
    expect(normalizeOutputPolicy(p)).toBe(p);
  });

  it.each([undefined, null, '', 'all', 'none', 42, {}, 'BOTH'])(
    'falls back to both for invalid value %j',
    (val) => {
      expect(normalizeOutputPolicy(val)).toBe('both');
    },
  );
});

describe('wantsPdf', () => {
  it('returns true for both', () => expect(wantsPdf('both')).toBe(true));
  it('returns true for pdf', () => expect(wantsPdf('pdf')).toBe(true));
  it('returns false for spa', () => expect(wantsPdf('spa')).toBe(false));
});

describe('wantsSpa', () => {
  it('returns true for both', () => expect(wantsSpa('both')).toBe(true));
  it('returns true for spa', () => expect(wantsSpa('spa')).toBe(true));
  it('returns false for pdf', () => expect(wantsSpa('pdf')).toBe(false));
});
