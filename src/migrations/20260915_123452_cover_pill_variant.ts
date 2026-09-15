import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_blocks_cover_pill_variant" AS ENUM('default', 'primary', 'secondary', 'ink', 'paper');
  ALTER TABLE "presentations_blocks_cover" ADD COLUMN "pill_variant" "enum_presentations_blocks_cover_pill_variant" DEFAULT 'default';`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cover" DROP COLUMN "pill_variant";
  DROP TYPE "public"."enum_presentations_blocks_cover_pill_variant";`);
}
