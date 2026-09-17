import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cover" DROP CONSTRAINT "presentations_blocks_cover_image_id_media_id_fk";
  
  DROP INDEX "presentations_blocks_cover_image_idx";
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";
  ALTER TABLE "presentations_blocks_cover" DROP COLUMN "pill_variant";
  ALTER TABLE "presentations_blocks_cover" DROP COLUMN "eyebrow";
  ALTER TABLE "presentations_blocks_cover" DROP COLUMN "image_id";
  ALTER TABLE "presentations_blocks_cover" DROP COLUMN "image_position";
  DROP TYPE "public"."enum_presentations_blocks_cover_pill_variant";
  DROP TYPE "public"."enum_presentations_blocks_cover_image_position";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_blocks_cover_pill_variant" AS ENUM('primary', 'secondary', 'ink', 'paper');
  CREATE TYPE "public"."enum_presentations_blocks_cover_image_position" AS ENUM('right', 'left');
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
  ALTER TABLE "presentations_blocks_cover" ADD COLUMN "pill_variant" "enum_presentations_blocks_cover_pill_variant";
  ALTER TABLE "presentations_blocks_cover" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presentations_blocks_cover" ADD COLUMN "image_id" integer;
  ALTER TABLE "presentations_blocks_cover" ADD COLUMN "image_position" "enum_presentations_blocks_cover_image_position" DEFAULT 'right';
  ALTER TABLE "presentations_blocks_cover" ADD CONSTRAINT "presentations_blocks_cover_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "presentations_blocks_cover_image_idx" ON "presentations_blocks_cover" USING btree ("image_id");`);
}
