import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_agent_runs_status" AS ENUM('queued', 'running', 'suspended', 'waiting', 'succeeded', 'failed', 'canceled', 'stale');
  CREATE TYPE "public"."enum_agent_runs_phase" AS ENUM('gather', 'structure', 'approval', 'draft', 'validate', 'visual', 'assemble', 'persist', 'complete');
  CREATE TYPE "public"."enum_agent_runs_command" AS ENUM('start', 'restart', 'resume', 'timeTravel');
  CREATE TYPE "public"."enum_agent_runs_mode" AS ENUM('replace', 'augment', 'revise');
  CREATE TYPE "public"."enum_agent_runs_language" AS ENUM('fr', 'en');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'agentDraft';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'agentRetention';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'agentDraft';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'agentRetention';
  CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"presentation_id" integer NOT NULL,
	"created_by_id" integer NOT NULL,
	"organisation_id" integer,
	"mastra_run_id" varchar NOT NULL,
	"payload_job_id" varchar,
	"request_id" varchar NOT NULL,
	"trace_id" varchar NOT NULL,
	"status" "enum_agent_runs_status" DEFAULT 'queued' NOT NULL,
	"phase" "enum_agent_runs_phase" DEFAULT 'gather',
	"command" "enum_agent_runs_command" DEFAULT 'start' NOT NULL,
	"mode" "enum_agent_runs_mode" NOT NULL,
	"brief" varchar NOT NULL,
	"language" "enum_agent_runs_language" NOT NULL,
	"visual" boolean DEFAULT true,
	"approval_required" boolean DEFAULT false,
	"source_ids" jsonb,
	"revision_context" varchar,
	"input_fingerprint" varchar NOT NULL,
	"events" jsonb,
	"evidence" jsonb,
	"source_failures" jsonb,
	"suspended_step" varchar,
	"suspend_payload" jsonb,
	"resume_decision" jsonb,
	"target_step" varchar,
	"attempt" numeric DEFAULT 0,
	"error_code" varchar,
	"error_summary" varchar,
	"started_at" timestamp(3) with time zone,
	"heartbeat_at" timestamp(3) with time zone,
	"suspended_at" timestamp(3) with time zone,
	"completed_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "presentations" ADD COLUMN "latest_agent_run_id" integer;
  ALTER TABLE "presentations" ADD COLUMN "draft_request_id" varchar;
  ALTER TABLE "presentations" ADD COLUMN "draft_trace_id" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_runs_id" integer;
  ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "agent_runs_presentation_idx" ON "agent_runs" USING btree ("presentation_id");
  CREATE INDEX "agent_runs_created_by_idx" ON "agent_runs" USING btree ("created_by_id");
  CREATE INDEX "agent_runs_organisation_idx" ON "agent_runs" USING btree ("organisation_id");
  CREATE UNIQUE INDEX "agent_runs_mastra_run_id_idx" ON "agent_runs" USING btree ("mastra_run_id");
  CREATE INDEX "agent_runs_payload_job_id_idx" ON "agent_runs" USING btree ("payload_job_id");
  CREATE INDEX "agent_runs_request_id_idx" ON "agent_runs" USING btree ("request_id");
  CREATE INDEX "agent_runs_trace_id_idx" ON "agent_runs" USING btree ("trace_id");
  CREATE INDEX "agent_runs_status_idx" ON "agent_runs" USING btree ("status");
  CREATE INDEX "agent_runs_input_fingerprint_idx" ON "agent_runs" USING btree ("input_fingerprint");
  CREATE INDEX "agent_runs_heartbeat_at_idx" ON "agent_runs" USING btree ("heartbeat_at");
  CREATE INDEX "agent_runs_updated_at_idx" ON "agent_runs" USING btree ("updated_at");
  CREATE INDEX "agent_runs_created_at_idx" ON "agent_runs" USING btree ("created_at");
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_latest_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("latest_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_runs_fk" FOREIGN KEY ("agent_runs_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_latest_agent_run_idx" ON "presentations" USING btree ("latest_agent_run_id");
  CREATE INDEX "payload_locked_documents_rels_agent_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_runs_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "agent_runs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "agent_runs" CASCADE;
  ALTER TABLE "presentations" DROP CONSTRAINT "presentations_latest_agent_run_id_agent_runs_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_runs_fk";

  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'buildSlides');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'buildSlides');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "presentations_latest_agent_run_idx";
  DROP INDEX "payload_locked_documents_rels_agent_runs_id_idx";
  ALTER TABLE "presentations" DROP COLUMN "latest_agent_run_id";
  ALTER TABLE "presentations" DROP COLUMN "draft_request_id";
  ALTER TABLE "presentations" DROP COLUMN "draft_trace_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_runs_id";
  DROP TYPE "public"."enum_agent_runs_status";
  DROP TYPE "public"."enum_agent_runs_phase";
  DROP TYPE "public"."enum_agent_runs_command";
  DROP TYPE "public"."enum_agent_runs_mode";
  DROP TYPE "public"."enum_agent_runs_language";`);
}
