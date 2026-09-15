import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_stats" ADD COLUMN "lead" jsonb;
  ALTER TABLE "presentations_blocks_quotes" ADD COLUMN "lead" jsonb;
  ALTER TABLE "presentations_blocks_table" ADD COLUMN "lead" jsonb;
  ALTER TABLE "presentations_blocks_timeline" ADD COLUMN "lead" jsonb;
  ALTER TABLE "presentations_blocks_mermaid" ADD COLUMN "lead" jsonb;
  ALTER TABLE "presentations_blocks_agenda" ADD COLUMN "lead" jsonb;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_stats" DROP COLUMN "lead";
  ALTER TABLE "presentations_blocks_quotes" DROP COLUMN "lead";
  ALTER TABLE "presentations_blocks_table" DROP COLUMN "lead";
  ALTER TABLE "presentations_blocks_timeline" DROP COLUMN "lead";
  ALTER TABLE "presentations_blocks_mermaid" DROP COLUMN "lead";
  ALTER TABLE "presentations_blocks_agenda" DROP COLUMN "lead";`);
}
