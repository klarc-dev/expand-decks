import { describe, expect, it } from 'vitest';

import { heroSurfaceFit } from '../density';

describe('heroSurfaceFit()', () => {
  it('preserves cover image and no-image thresholds', () => {
    expect(
      heroSurfaceFit({ profile: 'cover', title: 'A'.repeat(104), hasImage: false, peopleCount: 0 }),
    ).toBe('comfortable');
    expect(
      heroSurfaceFit({ profile: 'cover', title: 'A'.repeat(153), hasImage: false, peopleCount: 0 }),
    ).toBe('compact');
    expect(
      heroSurfaceFit({ profile: 'cover', title: 'A'.repeat(72), hasImage: true, peopleCount: 0 }),
    ).toBe('compact');
  });

  it('counts cover people occupancy behind the profile', () => {
    expect(heroSurfaceFit({ profile: 'cover', title: '', hasImage: false, peopleCount: 3 })).toBe(
      'comfortable',
    );
    expect(heroSurfaceFit({ profile: 'cover', title: '', hasImage: false, peopleCount: 4 })).toBe(
      'compact',
    );
  });

  it('preserves section image constraints', () => {
    expect(heroSurfaceFit({ profile: 'section', title: 'A'.repeat(100), hasImage: false })).toBe(
      'comfortable',
    );
    expect(heroSurfaceFit({ profile: 'section', title: 'A'.repeat(74), hasImage: true })).toBe(
      'compact',
    );
  });

  it('makes display statements denser than title-scale statements for identical copy', () => {
    const title = 'A'.repeat(120);
    expect(heroSurfaceFit({ profile: 'statement', title, scale: 'title' })).toBe('comfortable');
    expect(heroSurfaceFit({ profile: 'statement', title, scale: 'display' })).toBe('compact');
  });

  it('counts CTA actions and rendered supporting regions', () => {
    expect(heroSurfaceFit({ profile: 'cta', title: 'A'.repeat(80), actionLabels: [] })).toBe(
      'comfortable',
    );
    expect(
      heroSurfaceFit({
        profile: 'cta',
        title: 'A'.repeat(80),
        subtitle: `<p>${'B'.repeat(40)}</p>`,
        actionLabels: ['Primary action', 'Secondary action'],
      }),
    ).toBe('compact');
  });

  it('normalizes rendered HTML before measuring supporting copy', () => {
    expect(
      heroSurfaceFit({
        profile: 'section',
        title: '',
        subtitle: `<p>${'A'.repeat(239)}</p>`,
        hasImage: false,
      }),
    ).toBe('comfortable');
    expect(
      heroSurfaceFit({
        profile: 'section',
        title: '',
        subtitle: `<p>${'A'.repeat(240)}</p>`,
        hasImage: false,
      }),
    ).toBe('compact');
  });
});
