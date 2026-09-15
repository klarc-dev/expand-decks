import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "website" varchar;
  ALTER TABLE "presentations_blocks_quotes" ADD COLUMN "link_label" varchar;
  ALTER TABLE "presentations_blocks_quotes" ADD COLUMN "link_url" varchar;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "website";
  ALTER TABLE "presentations_blocks_quotes" DROP COLUMN "link_label";
  ALTER TABLE "presentations_blocks_quotes" DROP COLUMN "link_url";`);
}
