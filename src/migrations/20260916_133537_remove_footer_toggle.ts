import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * The footer is no longer a per-presentation toggle: the document template
 * decides whether a deck shows one. Drop the checkbox column and the legacy
 * text columns that survived earlier footer simplifications.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations" DROP COLUMN IF EXISTS "footer_enabled";
  ALTER TABLE "presentations" DROP COLUMN IF EXISTS "footer_left";
  ALTER TABLE "presentations" DROP COLUMN IF EXISTS "footer_center";
  ALTER TABLE "presentations" DROP COLUMN IF EXISTS "footer_right";`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations" ADD COLUMN IF NOT EXISTS "footer_enabled" boolean DEFAULT true;
  ALTER TABLE "presentations" ADD COLUMN IF NOT EXISTS "footer_left" varchar DEFAULT '{org.name}';
  ALTER TABLE "presentations" ADD COLUMN IF NOT EXISTS "footer_center" varchar;
  ALTER TABLE "presentations" ADD COLUMN IF NOT EXISTS "footer_right" varchar DEFAULT '{page} / {total}';`);
}
