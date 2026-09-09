import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_presentations_document_template" ADD VALUE 'visual-publication';
  ALTER TYPE "public"."enum_presentations_document_template" ADD VALUE 'sales-sheet';`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations" ALTER COLUMN "document_template" SET DATA TYPE text;
  ALTER TABLE "presentations" ALTER COLUMN "document_template" SET DEFAULT 'presentation'::text;
  DROP TYPE "public"."enum_presentations_document_template";
  CREATE TYPE "public"."enum_presentations_document_template" AS ENUM('presentation');
  ALTER TABLE "presentations" ALTER COLUMN "document_template" SET DEFAULT 'presentation'::"public"."enum_presentations_document_template";
  ALTER TABLE "presentations" ALTER COLUMN "document_template" SET DATA TYPE "public"."enum_presentations_document_template" USING "document_template"::"public"."enum_presentations_document_template";`);
}
