import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "presentations_blocks_card_grid_intervenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "phone" varchar;
  ALTER TABLE "users" ADD COLUMN "linkedin" varchar;
  ALTER TABLE "organisations" ADD COLUMN "website" varchar;
  ALTER TABLE "organisations" ADD COLUMN "booking_url" varchar;
  ALTER TABLE "organisations" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "organisations" ADD COLUMN "phone" varchar;
  ALTER TABLE "organisations" ADD COLUMN "linkedin" varchar;
  ALTER TABLE "presentations_blocks_cta" ADD COLUMN "primary_action_url" varchar;
  ALTER TABLE "presentations_blocks_cta" ADD COLUMN "secondary_action_url" varchar;
  ALTER TABLE "presentations_blocks_card_grid_intervenants" ADD CONSTRAINT "presentations_blocks_card_grid_intervenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid_intervenants" ADD CONSTRAINT "presentations_blocks_card_grid_intervenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_blocks_card_grid_intervenants_order_idx" ON "presentations_blocks_card_grid_intervenants" USING btree ("_order");
  CREATE INDEX "presentations_blocks_card_grid_intervenants_parent_id_idx" ON "presentations_blocks_card_grid_intervenants" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_card_grid_intervenants_user_idx" ON "presentations_blocks_card_grid_intervenants" USING btree ("user_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "presentations_blocks_card_grid_intervenants" CASCADE;
  ALTER TABLE "users" DROP COLUMN "phone";
  ALTER TABLE "users" DROP COLUMN "linkedin";
  ALTER TABLE "organisations" DROP COLUMN "website";
  ALTER TABLE "organisations" DROP COLUMN "booking_url";
  ALTER TABLE "organisations" DROP COLUMN "contact_email";
  ALTER TABLE "organisations" DROP COLUMN "phone";
  ALTER TABLE "organisations" DROP COLUMN "linkedin";
  ALTER TABLE "presentations_blocks_cta" DROP COLUMN "primary_action_url";
  ALTER TABLE "presentations_blocks_cta" DROP COLUMN "secondary_action_url";`);
}
