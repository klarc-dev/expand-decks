import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "presentations_blocks_cover" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_section" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_statement" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_two_cols" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_card_grid" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_stats" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_quotes" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_cta" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_table" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_timeline" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_mermaid" ADD COLUMN "layout_content" jsonb;
    ALTER TABLE "presentations_blocks_agenda" ADD COLUMN "layout_content" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "presentations_blocks_cover" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_section" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_statement" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_two_cols" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_card_grid" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_stats" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_quotes" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_cta" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_table" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_timeline" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_mermaid" DROP COLUMN "layout_content";
    ALTER TABLE "presentations_blocks_agenda" DROP COLUMN "layout_content";
  `);
}
