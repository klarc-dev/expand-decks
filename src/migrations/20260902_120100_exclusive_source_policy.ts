import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_agent_runs_source_policy" AS ENUM('none', 'exclusive', 'multiple');
    ALTER TABLE "agent_runs" ADD COLUMN "source_policy" "enum_agent_runs_source_policy" DEFAULT 'none' NOT NULL;
    UPDATE "agent_runs"
      SET "source_policy" = CASE
        WHEN jsonb_array_length(COALESCE("source_ids", '[]'::jsonb)) = 0 THEN 'none'::"enum_agent_runs_source_policy"
        ELSE 'multiple'::"enum_agent_runs_source_policy"
      END;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "agent_runs" DROP COLUMN "source_policy";
    DROP TYPE "public"."enum_agent_runs_source_policy";
  `);
}
