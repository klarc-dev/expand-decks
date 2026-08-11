import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organisations" ALTER COLUMN "heading_font" SET DATA TYPE varchar;
  ALTER TABLE "organisations" ALTER COLUMN "heading_font" SET DEFAULT 'Gilroy';
  ALTER TABLE "organisations" ALTER COLUMN "body_font" SET DATA TYPE varchar;
  ALTER TABLE "organisations" ALTER COLUMN "body_font" SET DEFAULT 'Roboto';
  ALTER TABLE "media" ADD COLUMN "presentation_id" integer;
  ALTER TABLE "media" ADD CONSTRAINT "media_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_presentation_idx" ON "media" USING btree ("presentation_id");
  DROP TYPE "public"."enum_organisations_heading_font";
  DROP TYPE "public"."enum_organisations_body_font";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organisations_heading_font" AS ENUM('Gilroy', 'Roboto');
  CREATE TYPE "public"."enum_organisations_body_font" AS ENUM('Roboto', 'Gilroy');
  ALTER TABLE "media" DROP CONSTRAINT "media_presentation_id_presentations_id_fk";
  
  DROP INDEX "media_presentation_idx";
  ALTER TABLE "organisations" ALTER COLUMN "heading_font" SET DEFAULT 'Gilroy'::"public"."enum_organisations_heading_font";
  ALTER TABLE "organisations" ALTER COLUMN "heading_font" SET DATA TYPE "public"."enum_organisations_heading_font" USING "heading_font"::"public"."enum_organisations_heading_font";
  ALTER TABLE "organisations" ALTER COLUMN "body_font" SET DEFAULT 'Roboto'::"public"."enum_organisations_body_font";
  ALTER TABLE "organisations" ALTER COLUMN "body_font" SET DATA TYPE "public"."enum_organisations_body_font" USING "body_font"::"public"."enum_organisations_body_font";
  ALTER TABLE "media" DROP COLUMN "presentation_id";
  `);
}
