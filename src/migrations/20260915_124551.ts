import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_two_cols" ADD COLUMN "left_user_id" integer;
  ALTER TABLE "presentations_blocks_two_cols" ADD CONSTRAINT "presentations_blocks_two_cols_left_user_id_users_id_fk" FOREIGN KEY ("left_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "presentations_blocks_two_cols_left_user_idx" ON "presentations_blocks_two_cols" USING btree ("left_user_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presentations_blocks_two_cols" DROP CONSTRAINT "presentations_blocks_two_cols_left_user_id_users_id_fk";
  
  DROP INDEX "presentations_blocks_two_cols_left_user_idx";
  ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN "left_user_id";`)
}
