import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "default_organisation_id" integer;
  ALTER TABLE "users" ADD CONSTRAINT "users_default_organisation_id_organisations_id_fk" FOREIGN KEY ("default_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_default_organisation_idx" ON "users" USING btree ("default_organisation_id");`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_default_organisation_id_organisations_id_fk";
  DROP INDEX "users_default_organisation_idx";
  ALTER TABLE "users" DROP COLUMN "default_organisation_id";`);
}
