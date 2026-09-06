import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../20260906_151740_knowledge_base_organisation.ts', import.meta.url),
  'utf8',
);

describe('knowledge organisation migration', () => {
  it('backfills creator default or sole membership before requiring ownership', () => {
    expect(source).toContain('ADD COLUMN "organisation_id" integer;');
    expect(source).toContain('"default_organisation_id"');
    expect(source).toContain('COUNT(DISTINCT "organisations_id") = 1');
    expect(source).toContain('"path" = \'organisations\'');
    expect(source).toContain('RAISE EXCEPTION');
    expect(source.indexOf('UPDATE "knowledge_bases"')).toBeLessThan(source.indexOf('SET NOT NULL'));
    expect(source).not.toContain('ADD COLUMN "organisation_id" integer NOT NULL');
  });
});
