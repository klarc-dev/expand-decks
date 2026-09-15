import { describe, expect, it } from 'vitest';

import { sequenceFrameFit } from '../density';

describe('sequenceFrameFit()', () => {
  it('keeps three short agenda rows centered and comfortable', () => {
    expect(
      sequenceFrameFit({
        profile: 'agenda',
        items: ['One', 'Two', 'Three'].map((label) => ({ label })),
      }),
    ).toEqual({ density: 'comfortable', mode: 'centered', crowded: false });
  });

  it('fits four short agenda rows without forcing crowded typography', () => {
    expect(
      sequenceFrameFit({
        profile: 'agenda',
        items: ['One', 'Two', 'Three', 'Four'].map((label) => ({ label })),
      }),
    ).toEqual({ density: 'comfortable', mode: 'fitted', crowded: false });
  });

  it('makes the six-row crowding threshold explicit below and at the boundary', () => {
    const five = sequenceFrameFit({
      profile: 'agenda',
      items: Array.from({ length: 5 }, (_, index) => ({ label: `Item ${index}` })),
    });
    const six = sequenceFrameFit({
      profile: 'agenda',
      items: Array.from({ length: 6 }, (_, index) => ({ label: `Item ${index}` })),
    });
    expect(five.crowded).toBe(false);
    expect(six.crowded).toBe(true);
    expect(six.mode).toBe('fitted');
  });

  it.each([
    [90, false],
    [91, true],
  ])('preserves the agenda maximum-description boundary at %i characters', (length, crowded) => {
    expect(
      sequenceFrameFit({
        profile: 'agenda',
        items: [{ label: 'One', description: 'A'.repeat(length) }],
      }).crowded,
    ).toBe(crowded);
  });

  it.each([
    [[72, 72, 72, 72, 72], false],
    [[73, 72, 72, 72, 72], true],
  ])('preserves the agenda total-description boundary', (lengths, crowded) => {
    expect(
      sequenceFrameFit({
        profile: 'agenda',
        items: lengths.map((length, index) => ({
          label: `Item ${index}`,
          description: 'A'.repeat(length),
        })),
      }).crowded,
    ).toBe(crowded);
  });

  it('preserves agenda density boundaries at scores 359, 360, 619 and 620', () => {
    const result = (descriptionLength: number) =>
      sequenceFrameFit({
        profile: 'agenda',
        items: [{ label: '', description: 'A'.repeat(descriptionLength) }],
      }).density;
    expect(result(307)).toBe('comfortable');
    expect(result(308)).toBe('compact');
    expect(result(567)).toBe('compact');
    expect(result(568)).toBe('dense');
  });

  it('keeps four short timeline steps horizontal', () => {
    const result = sequenceFrameFit({
      profile: 'timeline',
      items: Array.from({ length: 4 }, (_, index) => ({
        label: `Step ${index}`,
        description: 'Short',
      })),
    });
    expect(result.mode).toBe('horizontal');
    expect(result.crowded).toBe(false);
  });

  it('switches five timeline steps to the crowded vertical rail', () => {
    const result = sequenceFrameFit({
      profile: 'timeline',
      items: Array.from({ length: 5 }, (_, index) => ({
        label: `Step ${index}`,
        description: 'Short',
      })),
    });
    expect(result.mode).toBe('vertical');
    expect(result.crowded).toBe(true);
  });

  it('switches fewer timeline steps when one description crosses the proven limit', () => {
    const result = sequenceFrameFit({
      profile: 'timeline',
      items: [
        { label: 'One', description: 'A'.repeat(141) },
        { label: 'Two', description: 'Short' },
      ],
    });
    expect(result.mode).toBe('vertical');
    expect(result.crowded).toBe(true);
  });

  it.each([
    [[130, 129, 129, 129], false],
    [[131, 129, 129, 129], true],
  ])('preserves the timeline total-description boundary', (lengths, crowded) => {
    expect(
      sequenceFrameFit({
        profile: 'timeline',
        items: lengths.map((length, index) => ({
          label: `Step ${index}`,
          description: 'A'.repeat(length),
        })),
      }).crowded,
    ).toBe(crowded);
  });

  it('measures authored markdown strings without stripping visible tag-like copy', () => {
    const result = sequenceFrameFit({
      profile: 'agenda',
      items: [{ label: '<visible>', description: '<also-visible>'.repeat(8) }],
    });
    expect(result.crowded).toBe(true);
  });

  it('uses visible lead occupancy to increase density without changing topology', () => {
    const items = ['One', 'Two', 'Three'].map((label) => ({ label }));
    const normal = sequenceFrameFit({ profile: 'agenda', items });
    const occupied = sequenceFrameFit({
      profile: 'agenda',
      lead: `<p>${'Lead '.repeat(100)}</p>`,
      items,
    });
    expect(normal.mode).toBe('centered');
    expect(occupied.mode).toBe('centered');
    expect(normal.density).toBe('comfortable');
    expect(occupied.density).not.toBe('comfortable');
  });
});
