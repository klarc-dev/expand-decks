import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_presentations_agent_mode" AS ENUM('revise', 'replace', 'augment');
  CREATE TYPE "public"."enum_knowledge_bases_readiness" AS ENUM('ready', 'empty', 'failed', 'unavailable');
  CREATE TABLE "presentations_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"knowledge_bases_id" integer
  );
  
  ALTER TABLE "presentations" ADD COLUMN "agent_slide_count_min" numeric;
  ALTER TABLE "presentations" ADD COLUMN "agent_slide_count_max" numeric;
  ALTER TABLE "presentations" ADD COLUMN "agent_mode" "enum_presentations_agent_mode" DEFAULT 'revise';
  ALTER TABLE "presentations" ADD COLUMN "agent_model" varchar DEFAULT 'high';
  ALTER TABLE "presentations" ADD COLUMN "agent_visual_critique" boolean DEFAULT true;
  ALTER TABLE "presentations" ADD COLUMN "agent_approval_required" boolean DEFAULT false;
  ALTER TABLE "knowledge_bases" ADD COLUMN "readiness" "enum_knowledge_bases_readiness" DEFAULT 'empty';
  ALTER TABLE "presentations_rels" ADD CONSTRAINT "presentations_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_rels" ADD CONSTRAINT "presentations_rels_knowledge_bases_fk" FOREIGN KEY ("knowledge_bases_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_rels_order_idx" ON "presentations_rels" USING btree ("order");
  CREATE INDEX "presentations_rels_parent_idx" ON "presentations_rels" USING btree ("parent_id");
  CREATE INDEX "presentations_rels_path_idx" ON "presentations_rels" USING btree ("path");
  CREATE INDEX "presentations_rels_knowledge_bases_id_idx" ON "presentations_rels" USING btree ("knowledge_bases_id");
  CREATE INDEX "knowledge_bases_readiness_idx" ON "knowledge_bases" USING btree ("readiness");
  ALTER TABLE "presentations" DROP COLUMN "draft_events";
  ALTER TABLE "presentations" DROP COLUMN "draft_sources";
  ALTER TABLE "presentations" DROP COLUMN "draft_evidence";

  -- Backfill the stored readiness the source picker now reads instead of
  -- rescanning documents: same rule as the document lifecycle hook.
  UPDATE "knowledge_bases" AS kb
  SET "readiness" = (
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM "knowledge_documents" kd WHERE kd."knowledge_base_id" = kb."id"
      ) THEN 'empty'
      WHEN EXISTS (
        SELECT 1 FROM "knowledge_documents" kd
        WHERE kd."knowledge_base_id" = kb."id" AND kd."indexing_status" = 'indexed'
      ) THEN 'ready'
      WHEN NOT EXISTS (
        SELECT 1 FROM "knowledge_documents" kd
        WHERE kd."knowledge_base_id" = kb."id" AND kd."indexing_status" <> 'failed'
      ) THEN 'failed'
      ELSE 'unavailable'
    END
  )::"public"."enum_knowledge_bases_readiness";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "presentations_rels" CASCADE;
  DROP INDEX "knowledge_bases_readiness_idx";
  ALTER TABLE "presentations" ADD COLUMN "draft_events" jsonb;
  ALTER TABLE "presentations" ADD COLUMN "draft_sources" jsonb;
  ALTER TABLE "presentations" ADD COLUMN "draft_evidence" jsonb;
  ALTER TABLE "presentations" DROP COLUMN "agent_slide_count_min";
  ALTER TABLE "presentations" DROP COLUMN "agent_slide_count_max";
  ALTER TABLE "presentations" DROP COLUMN "agent_mode";
  ALTER TABLE "presentations" DROP COLUMN "agent_model";
  ALTER TABLE "presentations" DROP COLUMN "agent_visual_critique";
  ALTER TABLE "presentations" DROP COLUMN "agent_approval_required";
  ALTER TABLE "knowledge_bases" DROP COLUMN "readiness";
  DROP TYPE "public"."enum_presentations_agent_mode";
  DROP TYPE "public"."enum_knowledge_bases_readiness";`);
}
