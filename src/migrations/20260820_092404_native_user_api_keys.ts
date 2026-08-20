import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_api_keys_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_api_keys_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "api_keys_id";
  DROP TABLE IF EXISTS "api_keys_collections" CASCADE;
  DROP TABLE IF EXISTS "api_keys" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_api_keys_collections_collection";
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_api_keys_collections_collection" AS ENUM('users', 'organisations', 'presentations', 'media', 'accounts');
  CREATE TABLE "api_keys" (
    "id" serial PRIMARY KEY NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE "api_keys_collections" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "collection" "enum_api_keys_collections_collection"
  );
  ALTER TABLE "api_keys_collections" ADD CONSTRAINT "api_keys_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "api_keys_collections_order_idx" ON "api_keys_collections" USING btree ("_order");
  CREATE INDEX "api_keys_collections_parent_id_idx" ON "api_keys_collections" USING btree ("_parent_id");
  CREATE INDEX "api_keys_updated_at_idx" ON "api_keys" USING btree ("updated_at");
  CREATE INDEX "api_keys_created_at_idx" ON "api_keys" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "api_keys_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_api_keys_fk" FOREIGN KEY ("api_keys_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("api_keys_id");
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";`);
}
