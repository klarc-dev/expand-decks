import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const migrationsDir = dirname(fileURLToPath(import.meta.url));
const source = (name: string) => readFileSync(join(migrationsDir, '..', name), 'utf8');

describe('knowledge migration rollback safety', () => {
  it('removes lock relations before tables and tolerates already-absent objects', () => {
    const migration = source('20260903_092420_knowledge_collections.ts');
    const dropConstraint = migration.indexOf('DROP CONSTRAINT IF EXISTS');
    const dropDocuments = migration.indexOf('DROP TABLE IF EXISTS "knowledge_documents"');
    const dropBases = migration.indexOf('DROP TABLE IF EXISTS "knowledge_bases"');
    expect(dropConstraint).toBeGreaterThan(-1);
    expect(dropDocuments).toBeGreaterThan(dropConstraint);
    expect(dropBases).toBeGreaterThan(dropDocuments);
    expect(migration).not.toContain('DROP TABLE "knowledge_bases" CASCADE');
  });

  it('does not remove the shared vector extension or cascade schema deletion', () => {
    const migration = source('20260903_092452_pgvector_knowledge_schema.ts');
    const down = migration.slice(migration.indexOf('export async function down'));
    expect(down).not.toContain('DROP EXTENSION');
    expect(down).not.toContain('CASCADE');
    expect(down).toContain('DROP SCHEMA IF EXISTS "mastra_vectors" RESTRICT');
  });
});
