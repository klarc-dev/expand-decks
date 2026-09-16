import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cta" DROP COLUMN "secondary_action";
  ALTER TABLE "presentations_blocks_cta" DROP COLUMN "secondary_action_url";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cta" ADD COLUMN "secondary_action" varchar;
  ALTER TABLE "presentations_blocks_cta" ADD COLUMN "secondary_action_url" varchar;`);
}
