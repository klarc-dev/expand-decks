import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_SPECS } from '../index';

const reference = (name: string) =>
  readFileSync(`.agents/skills/slides/references/${name}.md`, 'utf8');

const finder = reference('capabilities');
const schema = reference('schema');

describe('slide skill discovery', () => {
  it('links every registered layout to its field reference', () => {
    for (const { blockType } of ALL_SPECS) {
      expect(finder).toContain(`[${blockType}](schema.md#${blockType.toLowerCase()})`);
      expect(schema).toContain(`### \`${blockType}\``);
    }
  });

  it('surfaces native member and slide targets without promising them in AI drafts', () => {
    expect(finder).toMatch(/\| \[cover\].*intervenants\[\]\.user → users/);
    expect(finder).toMatch(/\| \[agenda\].*items\[\]\.slideId/);
    expect(schema).toContain('`intervenants[].user` (relationship, Payload only)');
    expect(schema).toContain('`items[].slideId` (text, Payload only)');
    expect(schema).toContain('`items[].label` (text, draft + Payload)');
    expect(schema).not.toMatch(/^- `(layoutContent|preview)`/m);
  });
});
