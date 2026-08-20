/**
 * Generic Workspace user import — upserts portal users from a directory CSV.
 *
 *   pnpm users:import <csv> [--force]
 *
 * The CSV is whatever a directory export produces; only four columns are read,
 * all optional except the email:
 *
 *   primaryEmail | email               → the account key (upsert is by email)
 *   name.fullName | name               → `name`
 *   organizations.0.title | title      → `title` (fonction affichée)
 *   organizations.0.name | organisation→ `defaultOrganisation` (matched by name)
 *
 * Produce one from Google Workspace with:
 *   gam print users fields primaryEmail,name,organizations > /tmp/agents.csv
 *
 * Idempotent: existing users are patched (never duplicated, role and membership
 * status left untouched), new ones are created as `author` with a random
 * password — sign-in goes through Google OAuth, not this password.
 *
 * Refuses to run against a DATABASE_URL that looks like production unless
 * --force is passed, mirroring the deck seeds.
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { ROLES } from '../src/access/roles';
import { COLLECTIONS } from '../src/lib/collections';
import { runPayloadScript, type ScriptPayload } from './lib/payloadScript';

type Row = { email: string; name?: string; title?: string; organisation?: string };

const COLUMN_ALIASES = {
  email: ['primaryemail', 'email'],
  name: ['name.fullname', 'name', 'fullname'],
  title: ['organizations.0.title', 'title'],
  organisation: ['organizations.0.name', 'organisation', 'organization'],
} as const;

/** Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function readRows(path: string): Row[] {
  const table = parseCsv(readFileSync(path, 'utf8'));
  const header = table.shift();
  if (!header) throw new Error(`${path} is empty`);

  const headings = header.map((cell) => cell.trim().toLowerCase());
  const indexOf = (aliases: readonly string[]) => {
    for (const alias of aliases) {
      const index = headings.indexOf(alias);
      if (index !== -1) return index;
    }
    return -1;
  };
  const columns = {
    email: indexOf(COLUMN_ALIASES.email),
    name: indexOf(COLUMN_ALIASES.name),
    title: indexOf(COLUMN_ALIASES.title),
    organisation: indexOf(COLUMN_ALIASES.organisation),
  };
  if (columns.email === -1) {
    throw new Error(
      `${path}: no email column (expected one of ${COLUMN_ALIASES.email.join(', ')})`,
    );
  }

  const cell = (cells: string[], index: number) => {
    const value = index === -1 ? '' : (cells[index] ?? '').trim();
    return value || undefined;
  };

  return table
    .map<Row>((cells) => ({
      email: (cells[columns.email] ?? '').trim().toLowerCase(),
      name: cell(cells, columns.name),
      title: cell(cells, columns.title),
      organisation: cell(cells, columns.organisation),
    }))
    .filter((row) => row.email.includes('@'));
}

async function organisationIdByName(
  payload: ScriptPayload,
  cache: Map<string, number | undefined>,
  name: string,
): Promise<number | undefined> {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const found = await payload.find({
    collection: COLLECTIONS.organisations,
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const id = found.docs[0]?.id;
  cache.set(key, id);
  if (!id) console.warn(`No organisation named "${name}" — leaving defaultOrganisation unset.`);
  return id;
}

const csvPath = process.argv[2];
if (!csvPath || csvPath.startsWith('--')) {
  console.error('Usage: pnpm users:import <csv> [--force]');
  process.exit(1);
}
if (process.env.DATABASE_URL?.toLowerCase().includes('prod') && !process.argv.includes('--force')) {
  console.error(
    'Refusing to import: DATABASE_URL appears to point to production. Re-run with --force to override.',
  );
  process.exit(1);
}

await runPayloadScript(async (payload) => {
  const rows = readRows(csvPath);
  const orgCache = new Map<string, number | undefined>();
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const defaultOrganisation = row.organisation
      ? await organisationIdByName(payload, orgCache, row.organisation)
      : undefined;

    const existing = await payload.find({
      collection: COLLECTIONS.users,
      where: { email: { equals: row.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    // Only send the fields the CSV actually carries, so a sparse export never
    // blanks a profile that was completed in the admin.
    const data = {
      ...(row.name ? { name: row.name } : {}),
      ...(row.title ? { title: row.title } : {}),
      ...(defaultOrganisation ? { defaultOrganisation } : {}),
    };

    if (existing.docs.length > 0) {
      const id = existing.docs[0]!.id;
      await payload.update({
        collection: COLLECTIONS.users,
        id,
        data,
        overrideAccess: true,
      });
      updated += 1;
      console.log(`Updated ${row.email} (id ${id}).`);
    } else {
      const doc = await payload.create({
        collection: COLLECTIONS.users,
        data: {
          ...data,
          email: row.email,
          role: ROLES.author,
          membershipStatus: 'active',
          // Sign-in is Google OAuth; this password exists only because the auth
          // collection requires one and is never communicated.
          password: randomBytes(32).toString('base64url'),
        },
        overrideAccess: true,
      });
      created += 1;
      console.log(`Created ${row.email} (id ${doc.id}).`);
    }
  }

  console.log(`Done: ${created} created, ${updated} updated, ${rows.length} rows.`);
});
