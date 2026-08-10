import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_membership_status" AS ENUM('pending', 'active', 'rejected');
  ALTER TABLE "users" ADD COLUMN "membership_status" "enum_users_membership_status" DEFAULT 'active' NOT NULL;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "membership_status";
  DROP TYPE "public"."enum_users_membership_status";`);
}
