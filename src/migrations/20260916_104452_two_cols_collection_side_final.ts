import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_presentations_blocks_two_cols_collection_side" AS ENUM('left', 'right');
    ALTER TABLE "presentations_blocks_two_cols"
      ADD COLUMN "collection_side" "enum_presentations_blocks_two_cols_collection_side" DEFAULT 'right';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN "collection_side";
    DROP TYPE "public"."enum_presentations_blocks_two_cols_collection_side";
  `);
}
