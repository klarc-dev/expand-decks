import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "presentations_blocks_card_grid_intervenants" CASCADE;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "presentations_blocks_card_grid_intervenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"description" varchar
  );
  
  ALTER TABLE "presentations_blocks_card_grid_intervenants" ADD CONSTRAINT "presentations_blocks_card_grid_intervenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid_intervenants" ADD CONSTRAINT "presentations_blocks_card_grid_intervenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_blocks_card_grid_intervenants_order_idx" ON "presentations_blocks_card_grid_intervenants" USING btree ("_order");
  CREATE INDEX "presentations_blocks_card_grid_intervenants_parent_id_idx" ON "presentations_blocks_card_grid_intervenants" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_card_grid_intervenants_user_idx" ON "presentations_blocks_card_grid_intervenants" USING btree ("user_id");`);
}
