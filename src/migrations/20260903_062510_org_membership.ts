import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"organisations_id" integer
  );
  
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_organisations_fk" FOREIGN KEY ("organisations_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_organisations_id_idx" ON "users_rels" USING btree ("organisations_id");`);

  // Backfill membership. Presentation read access is now scoped by
  // `organisation`, so a user with an empty membership list sees nothing —
  // without this every existing account would lose its decks on deploy.
  //
  // Two sources, unioned: the user's `defaultOrganisation`, and the
  // organisation of every deck they authored (which is exactly what they could
  // read under the previous createdBy-based policy).
  await db.execute(sql`
   INSERT INTO "users_rels" ("order", "parent_id", "path", "organisations_id")
   SELECT row_number() OVER (PARTITION BY m."user_id" ORDER BY m."organisation_id"),
          m."user_id",
          'organisations',
          m."organisation_id"
   FROM (
     SELECT "id" AS "user_id", "default_organisation_id" AS "organisation_id"
     FROM "users"
     WHERE "default_organisation_id" IS NOT NULL
     UNION
     SELECT "created_by_id", "organisation_id"
     FROM "presentations"
     WHERE "created_by_id" IS NOT NULL AND "organisation_id" IS NOT NULL
   ) AS m;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_rels" CASCADE;`);
}
