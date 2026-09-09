import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_document_template" AS ENUM('presentation');
  ALTER TABLE "presentations" ADD COLUMN "document_template" "enum_presentations_document_template" DEFAULT 'presentation';`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations" DROP COLUMN "document_template";
  DROP TYPE "public"."enum_presentations_document_template";`);
}
