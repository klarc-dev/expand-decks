import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_markdown" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "presentations_blocks_markdown" CASCADE;
  ALTER TABLE "presentations_blocks_cover" ALTER COLUMN "pill_variant" DROP DEFAULT;
  ALTER TABLE "presentations_blocks_cover" ALTER COLUMN "pill_variant" SET DATA TYPE text;
  UPDATE "presentations_blocks_cover" SET "pill_variant" = NULL WHERE "pill_variant" = 'default';
  DROP TYPE "public"."enum_presentations_blocks_cover_pill_variant";
  CREATE TYPE "public"."enum_presentations_blocks_cover_pill_variant" AS ENUM('primary', 'secondary', 'ink', 'paper');
  ALTER TABLE "presentations_blocks_cover" ALTER COLUMN "pill_variant" SET DATA TYPE "public"."enum_presentations_blocks_cover_pill_variant" USING "pill_variant"::"public"."enum_presentations_blocks_cover_pill_variant";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "presentations_blocks_cover" ALTER COLUMN "pill_variant" SET DATA TYPE text;
  DROP TYPE "public"."enum_presentations_blocks_cover_pill_variant";
  CREATE TYPE "public"."enum_presentations_blocks_cover_pill_variant" AS ENUM('default', 'primary', 'secondary', 'ink', 'paper');
  ALTER TABLE "presentations_blocks_cover" ALTER COLUMN "pill_variant" SET DATA TYPE "public"."enum_presentations_blocks_cover_pill_variant" USING "pill_variant"::"public"."enum_presentations_blocks_cover_pill_variant";
  ALTER TABLE "presentations_blocks_cover" ALTER COLUMN "pill_variant" SET DEFAULT 'default';
  CREATE TABLE "presentations_blocks_markdown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" varchar,
  	"frontmatter" varchar,
  	"content" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "presentations_blocks_markdown" ADD CONSTRAINT "presentations_blocks_markdown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_blocks_markdown_order_idx" ON "presentations_blocks_markdown" USING btree ("_order");
  CREATE INDEX "presentations_blocks_markdown_parent_id_idx" ON "presentations_blocks_markdown" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_markdown_path_idx" ON "presentations_blocks_markdown" USING btree ("_path");`);
}
