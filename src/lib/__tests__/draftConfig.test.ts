import { describe, expect, it } from 'vitest';

import { ALL_SPECS } from '../../blocks/spec';
import { emitSlidesArraySchema } from '../../blocks/spec/emit/emitDraftSchema';
import { MAX_SLIDES, MIN_SLIDES } from '../draftConfig';

const slide = { blockType: 'cover', title: 'X' };
const deck = (n: number) => ({ slides: Array.from({ length: n }, () => slide) });

describe('draftConfig', () => {
  it('drives the slide-array bounds from the config consts, not inline literals', () => {
    const schema = emitSlidesArraySchema(ALL_SPECS);

    // Below MIN_SLIDES fails, exactly MIN_SLIDES passes.
    expect(schema.safeParse(deck(MIN_SLIDES - 1)).success).toBe(false);
    expect(schema.safeParse(deck(MIN_SLIDES)).success).toBe(true);

    // Exactly MAX_SLIDES passes, one over fails.
    expect(schema.safeParse(deck(MAX_SLIDES)).success).toBe(true);
    expect(schema.safeParse(deck(MAX_SLIDES + 1)).success).toBe(false);
  });
});
