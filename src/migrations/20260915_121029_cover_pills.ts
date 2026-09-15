import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "presentations_blocks_cover_pills" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  ALTER TABLE "presentations_blocks_cover_pills" ADD CONSTRAINT "presentations_blocks_cover_pills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_cover"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "presentations_blocks_cover_pills_order_idx" ON "presentations_blocks_cover_pills" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cover_pills_parent_id_idx" ON "presentations_blocks_cover_pills" USING btree ("_parent_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "presentations_blocks_cover_pills" CASCADE;`);
}
