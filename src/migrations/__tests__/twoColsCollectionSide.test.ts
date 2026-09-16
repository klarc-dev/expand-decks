import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const snapshot = (name: string) =>
  JSON.parse(readFileSync(new URL(`../${name}.json`, import.meta.url), 'utf8'));

const migration = readFileSync(
  new URL('../20260916_104452_two_cols_collection_side_final.ts', import.meta.url),
  'utf8',
);

describe('Two Columns collection-side final-schema migration', () => {
  it('changes only the collection-side enum and column after the 12-layout snapshot', () => {
    const before = snapshot('20260916_101917_slide_layout_content_12_blocks');
    const after = snapshot('20260916_104452_two_cols_collection_side_final');

    expect(after.prevId).toBe(before.id);
    delete after.id;
    delete after.prevId;
    delete before.id;
    delete before.prevId;

    const column = after.tables['public.presentations_blocks_two_cols'].columns.collection_side;
    delete after.tables['public.presentations_blocks_two_cols'].columns.collection_side;
    const collectionSideEnum =
      after.enums['public.enum_presentations_blocks_two_cols_collection_side'];
    delete after.enums['public.enum_presentations_blocks_two_cols_collection_side'];

    expect(column).toMatchObject({
      default: "'right'",
      name: 'collection_side',
      type: 'enum_presentations_blocks_two_cols_collection_side',
      typeSchema: 'public',
    });
    expect(collectionSideEnum).toEqual({
      name: 'enum_presentations_blocks_two_cols_collection_side',
      schema: 'public',
      values: ['left', 'right'],
    });
    expect(after).toEqual(before);
  });

  it('does not touch deleted layouts or media-production schema', () => {
    expect(migration).not.toMatch(/markdown|media_production|presentations_texts/);
    expect(migration.match(/CREATE TYPE/g)).toHaveLength(1);
    expect(migration.match(/ADD COLUMN/g)).toHaveLength(1);
    expect(migration.match(/DROP COLUMN/g)).toHaveLength(1);
    expect(migration.match(/DROP TYPE/g)).toHaveLength(1);
  });
});
