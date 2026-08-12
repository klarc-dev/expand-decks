import { describe, expect, it } from 'vitest';

import { SLUG_MAX, slugFromTitle } from '../slug';

describe('slugFromTitle', () => {
  it('derives a URL identifier from an accented presentation title', () => {
    expect(slugFromTitle('Structuration de la R&D — Groupe Perrin')).toBe(
      'structuration-de-la-r-d-groupe-perrin',
    );
  });

  it('caps identifiers without leaving a trailing separator', () => {
    const slug = slugFromTitle(`${'A'.repeat(SLUG_MAX - 1)} long title`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(slug.endsWith('-')).toBe(false);
  });
});
