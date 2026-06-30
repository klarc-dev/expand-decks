import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cover" DROP COLUMN "footer_left";
  ALTER TABLE "presentations_blocks_cover" DROP COLUMN "footer_right";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cover" ADD COLUMN "footer_left" jsonb;
  ALTER TABLE "presentations_blocks_cover" ADD COLUMN "footer_right" jsonb;`);
}
