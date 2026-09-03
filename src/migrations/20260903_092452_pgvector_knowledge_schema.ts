import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Vector storage groundwork for knowledge bases.
 *
 * Payload migrations own the shared extension and namespace only. Ticket #14's
 * ingestion runner deliberately uses one narrowly scoped PgVector instance with
 * `disableInit: false` to provision dynamic per-base tables; this is not general
 * application-schema initialization.
 *
 * Both DDL statements are `IF NOT EXISTS`, so replaying this migration against
 * an already-migrated database is a no-op rather than an error.
 *
 * `CREATE EXTENSION` needs an image that ships the pgvector shared library and
 * a role allowed to install it. Both hold: docker-compose.yaml pins
 * `pgvector/pgvector:0.8.6-pg16-bookworm`, and `DATABASE_URL` uses the
 * `POSTGRES_USER` bootstrap superuser.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   -- Installed into "public" on purpose. The vector types and distance
   -- operators then resolve under Postgres' default search_path, for Payload's
   -- own connection as well as for every schema below. @mastra/pg detects an
   -- already-installed extension (pg_extension lookup) and skips its own
   -- install attempt, so this does not fight the library.
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Dedicated namespace for the per-knowledge-base vector index tables that
   -- the ingestion work will create through PgVector. Keeping them out of
   -- "public" matters: Payload's Drizzle snapshot only models "public", so
   -- tables it does not know about would show up as drift in every subsequent
   -- migration diff, and a rollback becomes one DROP SCHEMA instead of a
   -- best-effort table sweep.
   CREATE SCHEMA IF NOT EXISTS "mastra_vectors";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The vector extension is shared, monotonic infrastructure: never remove it
  // from a feature rollback. RESTRICT also refuses to delete a namespace that
  // still contains per-base or foreign objects.
  await db.execute(sql`
   DROP SCHEMA IF EXISTS "mastra_vectors" RESTRICT;`);
}
