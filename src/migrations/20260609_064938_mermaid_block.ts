import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_blocks_statement_variant" AS ENUM('centered-hero', 'pull-quote', 'big-statement', 'split');
  CREATE TYPE "public"."enum_presentations_blocks_statement_surface" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_presentations_blocks_table_table_variant" AS ENUM('reference', 'matrix');
  CREATE TYPE "public"."enum_presentations_blocks_mermaid_surface" AS ENUM('dark', 'light');
  CREATE TABLE "presentations_blocks_mermaid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"surface" "enum_presentations_blocks_mermaid_surface" DEFAULT 'dark',
  	"source" varchar NOT NULL,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "presentations_blocks_statement" ADD COLUMN "variant" "enum_presentations_blocks_statement_variant";
  ALTER TABLE "presentations_blocks_statement" ADD COLUMN "surface" "enum_presentations_blocks_statement_surface" DEFAULT 'dark';
  ALTER TABLE "presentations_blocks_table" ADD COLUMN "table_variant" "enum_presentations_blocks_table_table_variant";
  ALTER TABLE "presentations_blocks_mermaid" ADD CONSTRAINT "presentations_blocks_mermaid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_blocks_mermaid_order_idx" ON "presentations_blocks_mermaid" USING btree ("_order");
  CREATE INDEX "presentations_blocks_mermaid_parent_id_idx" ON "presentations_blocks_mermaid" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_mermaid_path_idx" ON "presentations_blocks_mermaid" USING btree ("_path");`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "presentations_blocks_mermaid" CASCADE;
  ALTER TABLE "presentations_blocks_statement" DROP COLUMN "variant";
  ALTER TABLE "presentations_blocks_statement" DROP COLUMN "surface";
  ALTER TABLE "presentations_blocks_table" DROP COLUMN "table_variant";
  DROP TYPE "public"."enum_presentations_blocks_statement_variant";
  DROP TYPE "public"."enum_presentations_blocks_statement_surface";
  DROP TYPE "public"."enum_presentations_blocks_table_table_variant";
  DROP TYPE "public"."enum_presentations_blocks_mermaid_surface";`);
}
