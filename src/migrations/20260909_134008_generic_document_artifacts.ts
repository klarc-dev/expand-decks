import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_presentations_artifacts_kind" AS ENUM('pdf', 'web', 'image');
  CREATE TABLE "presentations_artifacts" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "kind" "enum_presentations_artifacts_kind" NOT NULL,
    "label" varchar NOT NULL,
    "action_label" varchar NOT NULL,
    "build_id" varchar NOT NULL,
    "file_id" integer,
    "url" varchar,
    "page_index" numeric
  );

  ALTER TABLE "presentations_artifacts" ADD CONSTRAINT "presentations_artifacts_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_artifacts" ADD CONSTRAINT "presentations_artifacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_artifacts_order_idx" ON "presentations_artifacts" USING btree ("_order");
  CREATE INDEX "presentations_artifacts_parent_id_idx" ON "presentations_artifacts" USING btree ("_parent_id");
  CREATE INDEX "presentations_artifacts_build_id_idx" ON "presentations_artifacts" USING btree ("build_id");
  CREATE INDEX "presentations_artifacts_file_idx" ON "presentations_artifacts" USING btree ("file_id");

  UPDATE "presentations"
  SET "last_build_token" = 'legacy-' || "id"::text
  WHERE "last_build_token" IS NULL
    AND ("pdf_file_id" IS NOT NULL OR NULLIF("spa_url", '') IS NOT NULL OR "cover_image_id" IS NOT NULL);

  INSERT INTO "presentations_artifacts"
    ("_order", "_parent_id", "id", "key", "kind", "label", "action_label", "build_id", "file_id")
  SELECT 0, "id", md5("id"::text || ':pdf:' || "last_build_token"), 'pdf', 'pdf', 'PDF',
    'Télécharger le PDF', "last_build_token", "pdf_file_id"
  FROM "presentations"
  WHERE "pdf_file_id" IS NOT NULL AND "last_build_token" IS NOT NULL;

  INSERT INTO "presentations_artifacts"
    ("_order", "_parent_id", "id", "key", "kind", "label", "action_label", "build_id", "url")
  SELECT 1, "id", md5("id"::text || ':web:' || "last_build_token"), 'web-presentation', 'web',
    'Présentation web', 'Ouvrir la présentation web', "last_build_token", "spa_url"
  FROM "presentations"
  WHERE NULLIF("spa_url", '') IS NOT NULL AND "last_build_token" IS NOT NULL;

  INSERT INTO "presentations_artifacts"
    ("_order", "_parent_id", "id", "key", "kind", "label", "action_label", "build_id", "file_id", "page_index")
  SELECT 2, "id", md5("id"::text || ':cover:' || "last_build_token"), 'cover-image', 'image',
    'Image de couverture', 'Ouvrir l’image de couverture', "last_build_token", "cover_image_id", 0
  FROM "presentations"
  WHERE "cover_image_id" IS NOT NULL AND "last_build_token" IS NOT NULL;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "presentations_artifacts" CASCADE;
  DROP TYPE "public"."enum_presentations_artifacts_kind";`);
}
