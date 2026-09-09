import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'src/migrations/20260909_134008_generic_document_artifacts.ts'),
  'utf8',
);

describe('generic document artifacts migration', () => {
  it('backfills legacy outputs in template order under one build identity', () => {
    expect(migration).toContain(`SET "last_build_token" = 'legacy-' || "id"::text`);
    expect(migration).toContain(`SELECT 0, "id"`);
    expect(migration).toContain(`'pdf', 'pdf', 'PDF'`);
    expect(migration).toContain(`SELECT 1, "id"`);
    expect(migration).toContain(`'web-presentation', 'web'`);
    expect(migration).toContain(`SELECT 2, "id"`);
    expect(migration).toContain(`'cover-image', 'image'`);
  });
});
