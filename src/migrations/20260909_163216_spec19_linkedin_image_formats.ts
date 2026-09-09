import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_media_production_requests_format"
      ADD VALUE IF NOT EXISTS 'linkedin_image';
    ALTER TYPE "public"."enum_media_production_requests_format"
      ADD VALUE IF NOT EXISTS 'linkedin_multi_image';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media_production_requests" ALTER COLUMN "format" SET DATA TYPE text;
    DROP TYPE "public"."enum_media_production_requests_format";
    CREATE TYPE "public"."enum_media_production_requests_format" AS ENUM(
      'linkedin_document_carousel'
    );
    ALTER TABLE "media_production_requests" ALTER COLUMN "format"
      SET DATA TYPE "public"."enum_media_production_requests_format"
      USING "format"::"public"."enum_media_production_requests_format";
  `);
}
