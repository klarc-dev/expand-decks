import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_production_requests_format" AS ENUM('linkedin_document_carousel');
  CREATE TYPE "public"."enum_media_production_requests_status" AS ENUM('queued', 'building', 'succeeded', 'failed', 'stale');
  CREATE TABLE "media_production_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" varchar NOT NULL,
	"publication_id" varchar NOT NULL,
	"revision_sha256" varchar NOT NULL,
	"format" "enum_media_production_requests_format" NOT NULL,
	"organisation_id" integer NOT NULL,
	"presentation_id" integer,
	"request" jsonb NOT NULL,
	"status" "enum_media_production_requests_status" DEFAULT 'queued' NOT NULL,
	"result" jsonb,
	"build_token" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "presentations" ADD COLUMN "current_media_production_request_id" integer;
  ALTER TABLE "media" ADD COLUMN "media_production_request_id" integer;
  ALTER TABLE "media" ADD COLUMN "producer_contract" varchar;
  ALTER TABLE "media" ADD COLUMN "producer_request_id" varchar;
  ALTER TABLE "media" ADD COLUMN "publication_id" varchar;
  ALTER TABLE "media" ADD COLUMN "revision_sha256" varchar;
  ALTER TABLE "media" ADD COLUMN "artifact_order" numeric;
  ALTER TABLE "media" ADD COLUMN "artifact_group" varchar;
  ALTER TABLE "media" ADD COLUMN "artifact_role" varchar;
  ALTER TABLE "media" ADD COLUMN "artifact_media_type" varchar;
  ALTER TABLE "media" ADD COLUMN "artifact_bytes" numeric;
  ALTER TABLE "media" ADD COLUMN "artifact_sha256" varchar;
  ALTER TABLE "media" ADD COLUMN "artifact_page_count" numeric;
  ALTER TABLE "media" ADD COLUMN "artifact_width_px" numeric;
  ALTER TABLE "media" ADD COLUMN "artifact_height_px" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_production_requests_id" integer;
  ALTER TABLE "media_production_requests" ADD CONSTRAINT "media_production_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_production_requests" ADD CONSTRAINT "media_production_requests_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "media_production_requests_request_id_idx" ON "media_production_requests" USING btree ("request_id");
  CREATE INDEX "media_production_requests_publication_id_idx" ON "media_production_requests" USING btree ("publication_id");
  CREATE INDEX "media_production_requests_organisation_idx" ON "media_production_requests" USING btree ("organisation_id");
  CREATE INDEX "media_production_requests_presentation_idx" ON "media_production_requests" USING btree ("presentation_id");
  CREATE INDEX "media_production_requests_build_token_idx" ON "media_production_requests" USING btree ("build_token");
  CREATE INDEX "media_production_requests_updated_at_idx" ON "media_production_requests" USING btree ("updated_at");
  CREATE INDEX "media_production_requests_created_at_idx" ON "media_production_requests" USING btree ("created_at");
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_current_media_production_request_id_media_production_requests_id_fk" FOREIGN KEY ("current_media_production_request_id") REFERENCES "public"."media_production_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_media_production_request_id_media_production_requests_id_fk" FOREIGN KEY ("media_production_request_id") REFERENCES "public"."media_production_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_production_requests_fk" FOREIGN KEY ("media_production_requests_id") REFERENCES "public"."media_production_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_current_media_production_request_idx" ON "presentations" USING btree ("current_media_production_request_id");
  CREATE INDEX "media_media_production_request_idx" ON "media" USING btree ("media_production_request_id");
  CREATE INDEX "media_producer_request_id_idx" ON "media" USING btree ("producer_request_id");
  CREATE INDEX "media_publication_id_idx" ON "media" USING btree ("publication_id");
  CREATE INDEX "payload_locked_documents_rels_media_production_requests__idx" ON "payload_locked_documents_rels" USING btree ("media_production_requests_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media_production_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_production_requests" CASCADE;
  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_current_media_production_request_id_media_production_requests_id_fk";

  ALTER TABLE "media" DROP CONSTRAINT "media_media_production_request_id_media_production_requests_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_production_requests_fk";

  DROP INDEX "presentations_current_media_production_request_idx";
  DROP INDEX "media_media_production_request_idx";
  DROP INDEX "media_producer_request_id_idx";
  DROP INDEX "media_publication_id_idx";
  DROP INDEX "payload_locked_documents_rels_media_production_requests__idx";
  ALTER TABLE "presentations" DROP COLUMN "current_media_production_request_id";
  ALTER TABLE "media" DROP COLUMN "media_production_request_id";
  ALTER TABLE "media" DROP COLUMN "producer_contract";
  ALTER TABLE "media" DROP COLUMN "producer_request_id";
  ALTER TABLE "media" DROP COLUMN "publication_id";
  ALTER TABLE "media" DROP COLUMN "revision_sha256";
  ALTER TABLE "media" DROP COLUMN "artifact_order";
  ALTER TABLE "media" DROP COLUMN "artifact_group";
  ALTER TABLE "media" DROP COLUMN "artifact_role";
  ALTER TABLE "media" DROP COLUMN "artifact_media_type";
  ALTER TABLE "media" DROP COLUMN "artifact_bytes";
  ALTER TABLE "media" DROP COLUMN "artifact_sha256";
  ALTER TABLE "media" DROP COLUMN "artifact_page_count";
  ALTER TABLE "media" DROP COLUMN "artifact_width_px";
  ALTER TABLE "media" DROP COLUMN "artifact_height_px";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_production_requests_id";
  DROP TYPE "public"."enum_media_production_requests_format";
  DROP TYPE "public"."enum_media_production_requests_status";`);
}
