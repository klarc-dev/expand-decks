import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations" DROP COLUMN "status";
  DROP TYPE "public"."enum_presentations_status";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_status" AS ENUM('draft', 'published');
  ALTER TABLE "presentations" ADD COLUMN "status" "enum_presentations_status" DEFAULT 'draft' NOT NULL;`);
}
