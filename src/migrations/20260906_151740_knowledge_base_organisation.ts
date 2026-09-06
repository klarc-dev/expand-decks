import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "knowledge_bases" ADD COLUMN "organisation_id" integer;

  -- Existing bases have no selection to preserve. Prefer the creator's explicit
  -- default; otherwise only a sole membership is unambiguous. Never guess the
  -- first organisation for multi-org creators or expose an unowned base.
  UPDATE "knowledge_bases" AS kb
  SET "organisation_id" = COALESCE(u."default_organisation_id", membership."organisation_id")
  FROM "users" AS u
  LEFT JOIN (
    SELECT "parent_id", MIN("organisations_id") AS "organisation_id"
    FROM "users_rels"
    WHERE "path" = 'organisations' AND "organisations_id" IS NOT NULL
    GROUP BY "parent_id"
    HAVING COUNT(DISTINCT "organisations_id") = 1
  ) AS membership ON membership."parent_id" = u."id"
  WHERE kb."created_by_id" = u."id";

  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM "knowledge_bases" WHERE "organisation_id" IS NULL) THEN
      RAISE EXCEPTION 'Knowledge bases have ambiguous or missing creator organisations. Set creator default organisations before retrying this migration.';
    END IF;
  END $$;

  ALTER TABLE "knowledge_bases" ALTER COLUMN "organisation_id" SET NOT NULL;
  ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "knowledge_bases_organisation_idx" ON "knowledge_bases" USING btree ("organisation_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "knowledge_bases" DROP CONSTRAINT "knowledge_bases_organisation_id_organisations_id_fk";
  
  DROP INDEX "knowledge_bases_organisation_idx";
  ALTER TABLE "knowledge_bases" DROP COLUMN "organisation_id";`);
}
