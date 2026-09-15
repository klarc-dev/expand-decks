import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // The intervenants "description" columns already exist in every deployed
  // database (added outside the migration chain), so the snapshot catches up
  // without failing where they are present.
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cover_intervenants" ADD COLUMN IF NOT EXISTS "description" varchar;
  ALTER TABLE "presentations_blocks_two_cols" ADD COLUMN "left_user_description" varchar;
  ALTER TABLE "presentations_blocks_card_grid_intervenants" ADD COLUMN IF NOT EXISTS "description" varchar;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Only the column this migration introduced is dropped: the intervenants
  // descriptions predate it and carry authored content.
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN "left_user_description";`);
}
