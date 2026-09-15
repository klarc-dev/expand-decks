import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // The twoCols left-column person card is gone (the contacts grid is the
  // single place where people appear). IF EXISTS keeps the chain safe on a
  // database where the heading column was never added.
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_two_cols" DROP CONSTRAINT IF EXISTS "presentations_blocks_two_cols_left_user_id_users_id_fk";
  DROP INDEX IF EXISTS "presentations_blocks_two_cols_left_user_idx";
  ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN IF EXISTS "left_user_heading";
  ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN IF EXISTS "left_user_id";
  ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN IF EXISTS "left_user_description";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_two_cols" ADD COLUMN "left_user_heading" varchar;
  ALTER TABLE "presentations_blocks_two_cols" ADD COLUMN "left_user_id" integer;
  ALTER TABLE "presentations_blocks_two_cols" ADD COLUMN "left_user_description" varchar;
  ALTER TABLE "presentations_blocks_two_cols" ADD CONSTRAINT "presentations_blocks_two_cols_left_user_id_users_id_fk" FOREIGN KEY ("left_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "presentations_blocks_two_cols_left_user_idx" ON "presentations_blocks_two_cols" USING btree ("left_user_id");`);
}
