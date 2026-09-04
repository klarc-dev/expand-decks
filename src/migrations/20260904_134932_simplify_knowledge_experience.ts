import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'knowledgeIngest';
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'knowledgeIngest';
    DROP INDEX "knowledge_documents_source_hash_idx";
    ALTER TABLE "knowledge_bases" DROP COLUMN "description";
    ALTER TABLE "knowledge_bases" DROP COLUMN "document_count";
    ALTER TABLE "knowledge_bases" DROP COLUMN "chunk_count";
    ALTER TABLE "knowledge_bases" DROP COLUMN "last_indexed_at";
    ALTER TABLE "knowledge_documents" DROP COLUMN "title";
    ALTER TABLE "knowledge_documents" DROP COLUMN "chunk_count";
    ALTER TABLE "knowledge_documents" DROP COLUMN "source_hash";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "knowledge_bases" ADD COLUMN "description" varchar;
    ALTER TABLE "knowledge_bases" ADD COLUMN "document_count" numeric DEFAULT 0;
    ALTER TABLE "knowledge_bases" ADD COLUMN "chunk_count" numeric DEFAULT 0;
    ALTER TABLE "knowledge_bases" ADD COLUMN "last_indexed_at" timestamp(3) with time zone;
    ALTER TABLE "knowledge_documents" ADD COLUMN "title" varchar;
    UPDATE "knowledge_documents"
      SET "title" = COALESCE(NULLIF("filename", ''), 'Document');
    ALTER TABLE "knowledge_documents" ALTER COLUMN "title" SET NOT NULL;
    ALTER TABLE "knowledge_documents" ADD COLUMN "chunk_count" numeric DEFAULT 0;
    ALTER TABLE "knowledge_documents" ADD COLUMN "source_hash" varchar;
    CREATE INDEX "knowledge_documents_source_hash_idx"
      ON "knowledge_documents" USING btree ("source_hash");
  `);
}
