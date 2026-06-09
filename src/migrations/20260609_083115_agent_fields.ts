import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_draft_status" AS ENUM('idle', 'gathering', 'structuring', 'drafting', 'validating', 'building', 'done', 'failed');
  ALTER TABLE "presentations" ADD COLUMN "draft_status" "enum_presentations_draft_status" DEFAULT 'idle';
  ALTER TABLE "presentations" ADD COLUMN "draft_events" jsonb;
  ALTER TABLE "presentations" ADD COLUMN "draft_run_id" varchar;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations" DROP COLUMN "draft_status";
  ALTER TABLE "presentations" DROP COLUMN "draft_events";
  ALTER TABLE "presentations" DROP COLUMN "draft_run_id";
  DROP TYPE "public"."enum_presentations_draft_status";`);
}
