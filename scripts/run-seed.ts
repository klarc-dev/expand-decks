/**
 * Generic deck seed dispatcher.
 *
 *   pnpm deck:seed <name>   →   runs scripts/seed-<name>.ts
 *
 * Seed scripts self-execute on import (they boot Payload, upsert their deck,
 * and call process.exit), so this runner just validates the name and imports
 * the matching module. Add a new seed by dropping a seed-<name>.ts file in
 * this directory — no registry to update.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];

if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error(
    'Usage: pnpm deck:seed <name>\nRuns scripts/seed-<name>.ts (lowercase letters, digits, hyphens).',
  );
  process.exit(1);
}

const target = join(here, `seed-${name}.ts`);
try {
  await import(target);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
    console.error(`No seed script found at scripts/seed-${name}.ts`);
    process.exit(1);
  }
  throw error;
}
