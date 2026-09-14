import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organisations" ADD COLUMN "logo_white_id" integer;
  ALTER TABLE "organisations" ADD COLUMN "logo_black_id" integer;
  ALTER TABLE "organisations" ADD CONSTRAINT "organisations_logo_white_id_media_id_fk" FOREIGN KEY ("logo_white_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organisations" ADD CONSTRAINT "organisations_logo_black_id_media_id_fk" FOREIGN KEY ("logo_black_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "organisations_logo_white_idx" ON "organisations" USING btree ("logo_white_id");
  CREATE INDEX "organisations_logo_black_idx" ON "organisations" USING btree ("logo_black_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organisations" DROP CONSTRAINT "organisations_logo_white_id_media_id_fk";
  
  ALTER TABLE "organisations" DROP CONSTRAINT "organisations_logo_black_id_media_id_fk";
  
  DROP INDEX "organisations_logo_white_idx";
  DROP INDEX "organisations_logo_black_idx";
  ALTER TABLE "organisations" DROP COLUMN "logo_white_id";
  ALTER TABLE "organisations" DROP COLUMN "logo_black_id";`);
}
