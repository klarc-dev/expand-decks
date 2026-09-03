import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_knowledge_documents_indexing_status" AS ENUM('pending', 'indexing', 'indexed', 'failed');
  CREATE TABLE "knowledge_bases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"document_count" numeric DEFAULT 0,
  	"chunk_count" numeric DEFAULT 0,
  	"last_indexed_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "knowledge_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"knowledge_base_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"indexing_status" "enum_knowledge_documents_indexing_status" DEFAULT 'pending' NOT NULL,
  	"chunk_count" numeric DEFAULT 0,
  	"error_message" varchar,
  	"source_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "knowledge_bases_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "knowledge_documents_id" integer;
  ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "knowledge_bases_created_by_idx" ON "knowledge_bases" USING btree ("created_by_id");
  CREATE INDEX "knowledge_bases_updated_at_idx" ON "knowledge_bases" USING btree ("updated_at");
  CREATE INDEX "knowledge_bases_created_at_idx" ON "knowledge_bases" USING btree ("created_at");
  CREATE INDEX "knowledge_documents_knowledge_base_idx" ON "knowledge_documents" USING btree ("knowledge_base_id");
  CREATE INDEX "knowledge_documents_indexing_status_idx" ON "knowledge_documents" USING btree ("indexing_status");
  CREATE INDEX "knowledge_documents_source_hash_idx" ON "knowledge_documents" USING btree ("source_hash");
  CREATE INDEX "knowledge_documents_updated_at_idx" ON "knowledge_documents" USING btree ("updated_at");
  CREATE INDEX "knowledge_documents_created_at_idx" ON "knowledge_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "knowledge_documents_filename_idx" ON "knowledge_documents" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_knowledge_bases_fk" FOREIGN KEY ("knowledge_bases_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_knowledge_documents_fk" FOREIGN KEY ("knowledge_documents_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_knowledge_bases_id_idx" ON "payload_locked_documents_rels" USING btree ("knowledge_bases_id");
  CREATE INDEX "payload_locked_documents_rels_knowledge_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("knowledge_documents_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_bases_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_documents_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_bases_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_documents_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_bases_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_documents_id";
  DROP TABLE IF EXISTS "knowledge_documents";
  DROP TABLE IF EXISTS "knowledge_bases";
  DROP TYPE IF EXISTS "public"."enum_knowledge_documents_indexing_status";`);
}
