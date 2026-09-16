import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organisations" DROP CONSTRAINT "organisations_created_by_id_users_id_fk";

  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_latest_agent_run_id_agent_runs_id_fk";

  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_created_by_id_users_id_fk";

  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_pdf_file_id_media_id_fk";

  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_cover_image_id_media_id_fk";

  ALTER TABLE "knowledge_bases" DROP CONSTRAINT "knowledge_bases_created_by_id_users_id_fk";

  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  UPDATE "users" SET "role" = 'author' WHERE "role" = 'viewer';
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'author'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'author');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'author'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  ALTER TABLE "presentations" ALTER COLUMN "status" SET DATA TYPE text;
  UPDATE "presentations" SET "status" = 'draft' WHERE "status" = 'archived';
  ALTER TABLE "presentations" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
  DROP TYPE "public"."enum_presentations_status";
  CREATE TYPE "public"."enum_presentations_status" AS ENUM('draft', 'published');
  ALTER TABLE "presentations" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."enum_presentations_status";
  ALTER TABLE "presentations" ALTER COLUMN "status" SET DATA TYPE "public"."enum_presentations_status" USING "status"::"public"."enum_presentations_status";
  DROP INDEX "organisations_created_by_idx";
  DROP INDEX "presentations_latest_agent_run_idx";
  DROP INDEX "presentations_created_by_idx";
  DROP INDEX "presentations_pdf_file_idx";
  DROP INDEX "presentations_cover_image_idx";
  DROP INDEX "agent_runs_input_fingerprint_idx";
  DROP INDEX "knowledge_bases_created_by_idx";
  DROP INDEX "media_production_requests_build_token_idx";
  ALTER TABLE "organisations" DROP COLUMN "contact_email";
  ALTER TABLE "organisations" DROP COLUMN "phone";
  ALTER TABLE "organisations" DROP COLUMN "linkedin";
  ALTER TABLE "organisations" DROP COLUMN "created_by_id";
  ALTER TABLE "presentations_artifacts" DROP COLUMN "kind";
  ALTER TABLE "presentations_artifacts" DROP COLUMN "label";
  ALTER TABLE "presentations" DROP COLUMN "latest_agent_run_id";
  ALTER TABLE "presentations" DROP COLUMN "draft_request_id";
  ALTER TABLE "presentations" DROP COLUMN "created_by_id";
  ALTER TABLE "presentations" DROP COLUMN "footer_left";
  ALTER TABLE "presentations" DROP COLUMN "footer_center";
  ALTER TABLE "presentations" DROP COLUMN "footer_right";
  ALTER TABLE "presentations" DROP COLUMN "spa_url";
  ALTER TABLE "presentations" DROP COLUMN "pdf_file_id";
  ALTER TABLE "presentations" DROP COLUMN "cover_image_id";
  ALTER TABLE "agent_runs" DROP COLUMN "input_fingerprint";
  ALTER TABLE "agent_runs" DROP COLUMN "evidence";
  ALTER TABLE "agent_runs" DROP COLUMN "source_failures";
  ALTER TABLE "agent_runs" DROP COLUMN "suspended_step";
  ALTER TABLE "agent_runs" DROP COLUMN "error_code";
  ALTER TABLE "agent_runs" DROP COLUMN "suspended_at";
  ALTER TABLE "agent_runs" DROP COLUMN "completed_at";
  ALTER TABLE "knowledge_bases" DROP COLUMN "created_by_id";
  ALTER TABLE "media_production_requests" DROP COLUMN "format";
  ALTER TABLE "media_production_requests" DROP COLUMN "status";
  ALTER TABLE "media_production_requests" DROP COLUMN "build_token";
  DROP TYPE "public"."enum_presentations_artifacts_kind";
  DROP TYPE "public"."enum_media_production_requests_format";
  DROP TYPE "public"."enum_media_production_requests_status";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_artifacts_kind" AS ENUM('pdf', 'web', 'image');
  CREATE TYPE "public"."enum_media_production_requests_format" AS ENUM('linkedin_document_carousel', 'linkedin_image', 'linkedin_multi_image');
  CREATE TYPE "public"."enum_media_production_requests_status" AS ENUM('queued', 'building', 'succeeded', 'failed', 'stale');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'viewer';
  ALTER TYPE "public"."enum_presentations_status" ADD VALUE 'archived';
  ALTER TABLE "organisations" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "organisations" ADD COLUMN "phone" varchar;
  ALTER TABLE "organisations" ADD COLUMN "linkedin" varchar;
  ALTER TABLE "organisations" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "presentations_artifacts" ADD COLUMN "kind" "enum_presentations_artifacts_kind" DEFAULT 'image' NOT NULL;
  UPDATE "presentations_artifacts" SET "kind" = 'pdf' WHERE "key" = 'pdf';
  UPDATE "presentations_artifacts" SET "kind" = 'web' WHERE "key" = 'web-presentation';
  ALTER TABLE "presentations_artifacts" ADD COLUMN "label" varchar DEFAULT '' NOT NULL;
  ALTER TABLE "presentations" ADD COLUMN "latest_agent_run_id" integer;
  ALTER TABLE "presentations" ADD COLUMN "draft_request_id" varchar;
  ALTER TABLE "presentations" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "presentations" ADD COLUMN "footer_left" varchar DEFAULT '{org.name}';
  ALTER TABLE "presentations" ADD COLUMN "footer_center" varchar;
  ALTER TABLE "presentations" ADD COLUMN "footer_right" varchar DEFAULT '{page} / {total}';
  ALTER TABLE "presentations" ADD COLUMN "spa_url" varchar;
  ALTER TABLE "presentations" ADD COLUMN "pdf_file_id" integer;
  ALTER TABLE "presentations" ADD COLUMN "cover_image_id" integer;
  ALTER TABLE "agent_runs" ADD COLUMN "input_fingerprint" varchar DEFAULT '' NOT NULL;
  ALTER TABLE "agent_runs" ADD COLUMN "evidence" jsonb;
  ALTER TABLE "agent_runs" ADD COLUMN "source_failures" jsonb;
  ALTER TABLE "agent_runs" ADD COLUMN "suspended_step" varchar;
  ALTER TABLE "agent_runs" ADD COLUMN "error_code" varchar;
  ALTER TABLE "agent_runs" ADD COLUMN "suspended_at" timestamp(3) with time zone;
  ALTER TABLE "agent_runs" ADD COLUMN "completed_at" timestamp(3) with time zone;
  ALTER TABLE "knowledge_bases" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "media_production_requests" ADD COLUMN "format" "enum_media_production_requests_format" DEFAULT 'linkedin_document_carousel' NOT NULL;
  ALTER TABLE "media_production_requests" ADD COLUMN "status" "enum_media_production_requests_status" DEFAULT 'queued' NOT NULL;
  ALTER TABLE "media_production_requests" ADD COLUMN "build_token" varchar;
  ALTER TABLE "organisations" ADD CONSTRAINT "organisations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_latest_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("latest_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_pdf_file_id_media_id_fk" FOREIGN KEY ("pdf_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "organisations_created_by_idx" ON "organisations" USING btree ("created_by_id");
  CREATE INDEX "presentations_latest_agent_run_idx" ON "presentations" USING btree ("latest_agent_run_id");
  CREATE INDEX "presentations_created_by_idx" ON "presentations" USING btree ("created_by_id");
  CREATE INDEX "presentations_pdf_file_idx" ON "presentations" USING btree ("pdf_file_id");
  CREATE INDEX "presentations_cover_image_idx" ON "presentations" USING btree ("cover_image_id");
  CREATE INDEX "agent_runs_input_fingerprint_idx" ON "agent_runs" USING btree ("input_fingerprint");
  CREATE INDEX "knowledge_bases_created_by_idx" ON "knowledge_bases" USING btree ("created_by_id");
  CREATE INDEX "media_production_requests_build_token_idx" ON "media_production_requests" USING btree ("build_token");`);
}
