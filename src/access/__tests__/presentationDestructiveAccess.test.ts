import { describe, expect, it } from 'vitest';

import { changesPresentationVisibilityOrRemovesSlides } from '../presentationDestructiveAccess';

const previous = { organisation: 12, slides: [{ id: 'first' }, { id: 'second' }] };

describe('detached presentation updates', () => {
  it('allows ordinary metadata updates and slide edits that keep all stable IDs', () => {
    expect(changesPresentationVisibilityOrRemovesSlides({ title: 'Nouveau titre' }, previous)).toBe(
      false,
    );
    expect(
      changesPresentationVisibilityOrRemovesSlides(
        {
          organisation: '12',
          slides: [{ id: 'second' }, { id: 'first', title: 'Modifiée' }, { id: 'new' }],
        },
        previous,
      ),
    ).toBe(false);
  });

  it('treats organisation changes and whole-layout slide replacements as destructive', () => {
    expect(changesPresentationVisibilityOrRemovesSlides({ organisation: 13 }, previous)).toBe(true);
    expect(changesPresentationVisibilityOrRemovesSlides({ slides: [] }, previous)).toBe(true);
    expect(
      changesPresentationVisibilityOrRemovesSlides(
        { slides: [{ id: 'new' }, { id: 'second' }] },
        previous,
      ),
    ).toBe(true);
  });
});
