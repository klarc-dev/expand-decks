import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const snapshot = (name: string) =>
  JSON.parse(readFileSync(new URL(`../${name}.json`, import.meta.url), 'utf8'));

describe('single CTA migration', () => {
  it('changes only the two removed CTA columns', () => {
    const before = snapshot('20260915_154407_drop_two_cols_left_user');
    const after = snapshot('20260916_085921_single_cta');
    for (const field of ['secondary_action', 'secondary_action_url']) {
      expect(before.tables['public.presentations_blocks_cta'].columns).toHaveProperty(field);
      delete before.tables['public.presentations_blocks_cta'].columns[field];
    }
    before.id = after.id;
    before.prevId = after.prevId;
    expect(after).toEqual(before);
  });
});
