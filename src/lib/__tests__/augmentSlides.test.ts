import { describe, expect, it } from 'vitest';

import { mergeAugmentedSlides } from '../augmentSlides';

describe('mergeAugmentedSlides', () => {
  it('appends drafted slides after existing ones', () => {
    const existing = [{ blockType: 'cover', title: 'A' }];
    const drafted = [{ blockType: 'statement', title: 'B' }];
    expect(mergeAugmentedSlides(existing, drafted)).toEqual([...existing, ...drafted]);
  });

  it('preserves each existing slide by reference (byte-identical, never copied/rewritten)', () => {
    // A Lexical-shaped existing slide — must come out the OTHER side untouched.
    const lexical = { blockType: 'statement', title: 'Kept', body: { root: { children: [] } } };
    const existing = [lexical];
    const drafted = [{ blockType: 'cta', title: 'New' }];

    const merged = mergeAugmentedSlides(existing, drafted);

    // Same object reference → provably not re-drafted or re-converted.
    expect(merged[0]).toBe(lexical);
    expect(merged[0]).toEqual(lexical);
  });

  it('returns only the drafted slides when there are no existing ones (augment on empty deck)', () => {
    const drafted = [{ blockType: 'cover', title: 'A' }];
    expect(mergeAugmentedSlides([], drafted)).toEqual(drafted);
  });
});
