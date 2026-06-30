import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_blocks_agenda_surface" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_api_keys_collections_collection" AS ENUM('users', 'organisations', 'presentations', 'media', 'share-links', 'accounts');
  CREATE TABLE "presentations_blocks_cover_intervenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_section_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_statement_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_two_cols_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_card_grid_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_stats_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_quotes_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_cta_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_table_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_timeline_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_mermaid_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_agenda_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "presentations_blocks_agenda_footnotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_agenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"surface" "enum_presentations_blocks_agenda_surface" DEFAULT 'dark',
  	"active" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "api_keys_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection" "enum_api_keys_collections_collection"
  );
  
  CREATE TABLE "api_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "title" varchar;
  ALTER TABLE "users" ADD COLUMN "avatar_id" integer;
  ALTER TABLE "presentations" ADD COLUMN "draft_sources" jsonb;
  ALTER TABLE "presentations" ADD COLUMN "draft_evidence" jsonb;
  ALTER TABLE "presentations" ADD COLUMN "last_build_token" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "api_keys_id" integer;
  ALTER TABLE "presentations_blocks_cover_intervenants" ADD CONSTRAINT "presentations_blocks_cover_intervenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cover_intervenants" ADD CONSTRAINT "presentations_blocks_cover_intervenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_cover"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_section_footnotes" ADD CONSTRAINT "presentations_blocks_section_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_statement_footnotes" ADD CONSTRAINT "presentations_blocks_statement_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_statement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_two_cols_footnotes" ADD CONSTRAINT "presentations_blocks_two_cols_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_two_cols"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid_footnotes" ADD CONSTRAINT "presentations_blocks_card_grid_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_stats_footnotes" ADD CONSTRAINT "presentations_blocks_stats_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_quotes_footnotes" ADD CONSTRAINT "presentations_blocks_quotes_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cta_footnotes" ADD CONSTRAINT "presentations_blocks_cta_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_table_footnotes" ADD CONSTRAINT "presentations_blocks_table_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_timeline_footnotes" ADD CONSTRAINT "presentations_blocks_timeline_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_mermaid_footnotes" ADD CONSTRAINT "presentations_blocks_mermaid_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_mermaid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_agenda_items" ADD CONSTRAINT "presentations_blocks_agenda_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_agenda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_agenda_footnotes" ADD CONSTRAINT "presentations_blocks_agenda_footnotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_agenda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_agenda" ADD CONSTRAINT "presentations_blocks_agenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "api_keys_collections" ADD CONSTRAINT "api_keys_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_blocks_cover_intervenants_order_idx" ON "presentations_blocks_cover_intervenants" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cover_intervenants_parent_id_idx" ON "presentations_blocks_cover_intervenants" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cover_intervenants_user_idx" ON "presentations_blocks_cover_intervenants" USING btree ("user_id");
  CREATE INDEX "presentations_blocks_section_footnotes_order_idx" ON "presentations_blocks_section_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_section_footnotes_parent_id_idx" ON "presentations_blocks_section_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_statement_footnotes_order_idx" ON "presentations_blocks_statement_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_statement_footnotes_parent_id_idx" ON "presentations_blocks_statement_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_two_cols_footnotes_order_idx" ON "presentations_blocks_two_cols_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_two_cols_footnotes_parent_id_idx" ON "presentations_blocks_two_cols_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_card_grid_footnotes_order_idx" ON "presentations_blocks_card_grid_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_card_grid_footnotes_parent_id_idx" ON "presentations_blocks_card_grid_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_stats_footnotes_order_idx" ON "presentations_blocks_stats_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_stats_footnotes_parent_id_idx" ON "presentations_blocks_stats_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_quotes_footnotes_order_idx" ON "presentations_blocks_quotes_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_quotes_footnotes_parent_id_idx" ON "presentations_blocks_quotes_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cta_footnotes_order_idx" ON "presentations_blocks_cta_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cta_footnotes_parent_id_idx" ON "presentations_blocks_cta_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_table_footnotes_order_idx" ON "presentations_blocks_table_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_table_footnotes_parent_id_idx" ON "presentations_blocks_table_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_timeline_footnotes_order_idx" ON "presentations_blocks_timeline_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_timeline_footnotes_parent_id_idx" ON "presentations_blocks_timeline_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_mermaid_footnotes_order_idx" ON "presentations_blocks_mermaid_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_mermaid_footnotes_parent_id_idx" ON "presentations_blocks_mermaid_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_agenda_items_order_idx" ON "presentations_blocks_agenda_items" USING btree ("_order");
  CREATE INDEX "presentations_blocks_agenda_items_parent_id_idx" ON "presentations_blocks_agenda_items" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_agenda_footnotes_order_idx" ON "presentations_blocks_agenda_footnotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_agenda_footnotes_parent_id_idx" ON "presentations_blocks_agenda_footnotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_agenda_order_idx" ON "presentations_blocks_agenda" USING btree ("_order");
  CREATE INDEX "presentations_blocks_agenda_parent_id_idx" ON "presentations_blocks_agenda" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_agenda_path_idx" ON "presentations_blocks_agenda" USING btree ("_path");
  CREATE INDEX "api_keys_collections_order_idx" ON "api_keys_collections" USING btree ("_order");
  CREATE INDEX "api_keys_collections_parent_id_idx" ON "api_keys_collections" USING btree ("_parent_id");
  CREATE INDEX "api_keys_updated_at_idx" ON "api_keys" USING btree ("updated_at");
  CREATE INDEX "api_keys_created_at_idx" ON "api_keys" USING btree ("created_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_api_keys_fk" FOREIGN KEY ("api_keys_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "payload_locked_documents_rels_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("api_keys_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_cover_intervenants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_section_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_statement_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_two_cols_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_card_grid_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_stats_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_quotes_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_cta_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_table_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_timeline_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_mermaid_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_agenda_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_agenda_footnotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presentations_blocks_agenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "api_keys_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "presentations_blocks_cover_intervenants" CASCADE;
  DROP TABLE "presentations_blocks_section_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_statement_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_two_cols_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_card_grid_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_stats_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_quotes_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_cta_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_table_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_timeline_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_mermaid_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_agenda_items" CASCADE;
  DROP TABLE "presentations_blocks_agenda_footnotes" CASCADE;
  DROP TABLE "presentations_blocks_agenda" CASCADE;
  DROP TABLE "api_keys_collections" CASCADE;
  DROP TABLE "api_keys" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT "users_avatar_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_api_keys_fk";
  
  DROP INDEX "users_avatar_idx";
  DROP INDEX "payload_locked_documents_rels_api_keys_id_idx";
  ALTER TABLE "users" DROP COLUMN "title";
  ALTER TABLE "users" DROP COLUMN "avatar_id";
  ALTER TABLE "presentations" DROP COLUMN "draft_sources";
  ALTER TABLE "presentations" DROP COLUMN "draft_evidence";
  ALTER TABLE "presentations" DROP COLUMN "last_build_token";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "api_keys_id";
  DROP TYPE "public"."enum_presentations_blocks_agenda_surface";
  DROP TYPE "public"."enum_api_keys_collections_collection";`);
}
