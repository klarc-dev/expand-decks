import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organisations_heading_font" AS ENUM('Gilroy', 'Roboto');
  CREATE TYPE "public"."enum_organisations_body_font" AS ENUM('Roboto', 'Gilroy');
  CREATE TABLE "organisations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"primary" varchar DEFAULT '#02585C' NOT NULL,
  	"secondary" varchar DEFAULT '#F5A3B0' NOT NULL,
  	"ink" varchar DEFAULT '#0F2A2B' NOT NULL,
  	"paper" varchar DEFAULT '#FAFBFB' NOT NULL,
  	"logo_id" integer,
  	"heading_font" "enum_organisations_heading_font" DEFAULT 'Gilroy' NOT NULL,
  	"body_font" "enum_organisations_body_font" DEFAULT 'Roboto' NOT NULL,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "presentations" ADD COLUMN "footer_enabled" boolean DEFAULT true;
  ALTER TABLE "presentations" ADD COLUMN "footer_left" varchar DEFAULT '{org.name}';
  ALTER TABLE "presentations" ADD COLUMN "footer_center" varchar;
  ALTER TABLE "presentations" ADD COLUMN "footer_right" varchar DEFAULT '{page} / {total}';
  -- Add the org relation NULLABLE first so the migration is safe on a table
  -- that already has rows; we backfill below, then enforce NOT NULL.
  ALTER TABLE "presentations" ADD COLUMN "organisation_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "organisations_id" integer;
  ALTER TABLE "organisations" ADD CONSTRAINT "organisations_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organisations" ADD CONSTRAINT "organisations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "organisations_logo_idx" ON "organisations" USING btree ("logo_id");
  CREATE INDEX "organisations_created_by_idx" ON "organisations" USING btree ("created_by_id");
  CREATE INDEX "organisations_updated_at_idx" ON "organisations" USING btree ("updated_at");
  CREATE INDEX "organisations_created_at_idx" ON "organisations" USING btree ("created_at");

  -- Backfill: ensure a default organisation exists and attach every existing
  -- presentation to it, so the NOT NULL constraint below can be enforced on a
  -- non-empty table. Idempotent.
  INSERT INTO "organisations" ("name") SELECT 'Klarc'
    WHERE NOT EXISTS (SELECT 1 FROM "organisations");
  UPDATE "presentations" SET "organisation_id" = (SELECT MIN("id") FROM "organisations")
    WHERE "organisation_id" IS NULL;
  ALTER TABLE "presentations" ALTER COLUMN "organisation_id" SET NOT NULL;

  -- FK is RESTRICT (not SET NULL): organisation_id is NOT NULL, so a referenced
  -- org cannot be deleted while presentations point at it.
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organisations_fk" FOREIGN KEY ("organisations_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_organisation_idx" ON "presentations" USING btree ("organisation_id");
  CREATE INDEX "payload_locked_documents_rels_organisations_id_idx" ON "payload_locked_documents_rels" USING btree ("organisations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organisations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "organisations" CASCADE;
  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_organisation_id_organisations_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_organisations_fk";
  
  DROP INDEX "presentations_organisation_idx";
  DROP INDEX "payload_locked_documents_rels_organisations_id_idx";
  ALTER TABLE "presentations" DROP COLUMN "footer_enabled";
  ALTER TABLE "presentations" DROP COLUMN "footer_left";
  ALTER TABLE "presentations" DROP COLUMN "footer_center";
  ALTER TABLE "presentations" DROP COLUMN "footer_right";
  ALTER TABLE "presentations" DROP COLUMN "organisation_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "organisations_id";
  DROP TYPE "public"."enum_organisations_heading_font";
  DROP TYPE "public"."enum_organisations_body_font";`)
}
