import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'author', 'viewer');
  CREATE TYPE "public"."enum_presentations_blocks_cover_surface" AS ENUM('dark', 'light', 'gradient');
  CREATE TYPE "public"."enum_presentations_blocks_cover_image_position" AS ENUM('right', 'left');
  CREATE TYPE "public"."enum_presentations_blocks_section_surface" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_presentations_blocks_section_image_position" AS ENUM('right', 'left');
  CREATE TYPE "public"."enum_presentations_blocks_two_cols_image_position" AS ENUM('right', 'left');
  CREATE TYPE "public"."enum_presentations_blocks_card_grid_columns" AS ENUM('2', '3', '4');
  CREATE TYPE "public"."enum_presentations_blocks_stats_surface" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_presentations_blocks_table_surface" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_presentations_blocks_timeline_surface" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_presentations_language" AS ENUM('fr', 'en');
  CREATE TYPE "public"."enum_presentations_last_build_status" AS ENUM('idle', 'building', 'success', 'failed');
  CREATE TYPE "public"."enum_presentations_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'buildSlides');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'buildSlides');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'author' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "presentations_blocks_cover" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" jsonb,
  	"footer_left" jsonb,
  	"footer_right" jsonb,
  	"surface" "enum_presentations_blocks_cover_surface" DEFAULT 'dark',
  	"image_id" integer,
  	"image_position" "enum_presentations_blocks_cover_image_position" DEFAULT 'right',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" jsonb,
  	"surface" "enum_presentations_blocks_section_surface" DEFAULT 'dark',
  	"image_id" integer,
  	"image_position" "enum_presentations_blocks_section_image_position" DEFAULT 'right',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"body" jsonb,
  	"footer" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_two_cols_right_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" jsonb
  );
  
  CREATE TABLE "presentations_blocks_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"intro" jsonb,
  	"left_footer" jsonb,
  	"image_id" integer,
  	"image_position" "enum_presentations_blocks_two_cols_image_position" DEFAULT 'right',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"title" varchar NOT NULL,
  	"description" jsonb
  );
  
  CREATE TABLE "presentations_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"sidebar_text" jsonb,
  	"columns" "enum_presentations_blocks_card_grid_columns" DEFAULT '4',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"surface" "enum_presentations_blocks_stats_surface" DEFAULT 'dark',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_quotes_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" jsonb NOT NULL,
  	"author_name" varchar NOT NULL,
  	"author_role" varchar
  );
  
  CREATE TABLE "presentations_blocks_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" jsonb,
  	"primary_action" varchar,
  	"secondary_action" varchar,
  	"footer_note" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"header" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" jsonb
  );
  
  CREATE TABLE "presentations_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"surface" "enum_presentations_blocks_table_surface" DEFAULT 'light',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_timeline_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "presentations_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"surface" "enum_presentations_blocks_timeline_surface" DEFAULT 'light',
  	"footer" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_markdown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" varchar,
  	"frontmatter" varchar,
  	"content" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"language" "enum_presentations_language" DEFAULT 'fr' NOT NULL,
  	"last_build_status" "enum_presentations_last_build_status" DEFAULT 'idle',
  	"spa_url" varchar,
  	"pdf_file_id" integer,
  	"cover_image_id" integer,
  	"last_build_error" varchar,
  	"status" "enum_presentations_status" DEFAULT 'draft' NOT NULL,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "presentations_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "share_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"presentation_id" integer NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"created_by_id" integer,
  	"view_count" numeric DEFAULT 0,
  	"last_viewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"picture" varchar,
  	"user_id" integer NOT NULL,
  	"issuer_name" varchar NOT NULL,
  	"scope" varchar,
  	"sub" varchar NOT NULL,
  	"access_token" varchar,
  	"refresh_token" varchar,
  	"expires_in" numeric,
  	"passkey_credential_id" varchar,
  	"passkey_public_key" jsonb,
  	"passkey_counter" numeric,
  	"passkey_transports" jsonb,
  	"passkey_device_type" varchar,
  	"passkey_backed_up" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"presentations_id" integer,
  	"media_id" integer,
  	"share_links_id" integer,
  	"accounts_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cover" ADD CONSTRAINT "presentations_blocks_cover_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cover" ADD CONSTRAINT "presentations_blocks_cover_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_section" ADD CONSTRAINT "presentations_blocks_section_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_blocks_section" ADD CONSTRAINT "presentations_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_statement" ADD CONSTRAINT "presentations_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_two_cols_right_cards" ADD CONSTRAINT "presentations_blocks_two_cols_right_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_two_cols"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_two_cols" ADD CONSTRAINT "presentations_blocks_two_cols_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_blocks_two_cols" ADD CONSTRAINT "presentations_blocks_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid_cards" ADD CONSTRAINT "presentations_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid" ADD CONSTRAINT "presentations_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_stats_stats" ADD CONSTRAINT "presentations_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_stats" ADD CONSTRAINT "presentations_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_quotes_quotes" ADD CONSTRAINT "presentations_blocks_quotes_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_quotes" ADD CONSTRAINT "presentations_blocks_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cta" ADD CONSTRAINT "presentations_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_table_columns" ADD CONSTRAINT "presentations_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_table_rows_cells" ADD CONSTRAINT "presentations_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_table_rows" ADD CONSTRAINT "presentations_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_table" ADD CONSTRAINT "presentations_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_timeline_steps" ADD CONSTRAINT "presentations_blocks_timeline_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_timeline" ADD CONSTRAINT "presentations_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_markdown" ADD CONSTRAINT "presentations_blocks_markdown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_pdf_file_id_media_id_fk" FOREIGN KEY ("pdf_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations_texts" ADD CONSTRAINT "presentations_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "share_links" ADD CONSTRAINT "share_links_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_presentations_fk" FOREIGN KEY ("presentations_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_share_links_fk" FOREIGN KEY ("share_links_id") REFERENCES "public"."share_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_accounts_fk" FOREIGN KEY ("accounts_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "presentations_blocks_cover_order_idx" ON "presentations_blocks_cover" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cover_parent_id_idx" ON "presentations_blocks_cover" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cover_path_idx" ON "presentations_blocks_cover" USING btree ("_path");
  CREATE INDEX "presentations_blocks_cover_image_idx" ON "presentations_blocks_cover" USING btree ("image_id");
  CREATE INDEX "presentations_blocks_section_order_idx" ON "presentations_blocks_section" USING btree ("_order");
  CREATE INDEX "presentations_blocks_section_parent_id_idx" ON "presentations_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_section_path_idx" ON "presentations_blocks_section" USING btree ("_path");
  CREATE INDEX "presentations_blocks_section_image_idx" ON "presentations_blocks_section" USING btree ("image_id");
  CREATE INDEX "presentations_blocks_statement_order_idx" ON "presentations_blocks_statement" USING btree ("_order");
  CREATE INDEX "presentations_blocks_statement_parent_id_idx" ON "presentations_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_statement_path_idx" ON "presentations_blocks_statement" USING btree ("_path");
  CREATE INDEX "presentations_blocks_two_cols_right_cards_order_idx" ON "presentations_blocks_two_cols_right_cards" USING btree ("_order");
  CREATE INDEX "presentations_blocks_two_cols_right_cards_parent_id_idx" ON "presentations_blocks_two_cols_right_cards" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_two_cols_order_idx" ON "presentations_blocks_two_cols" USING btree ("_order");
  CREATE INDEX "presentations_blocks_two_cols_parent_id_idx" ON "presentations_blocks_two_cols" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_two_cols_path_idx" ON "presentations_blocks_two_cols" USING btree ("_path");
  CREATE INDEX "presentations_blocks_two_cols_image_idx" ON "presentations_blocks_two_cols" USING btree ("image_id");
  CREATE INDEX "presentations_blocks_card_grid_cards_order_idx" ON "presentations_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "presentations_blocks_card_grid_cards_parent_id_idx" ON "presentations_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_card_grid_order_idx" ON "presentations_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "presentations_blocks_card_grid_parent_id_idx" ON "presentations_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_card_grid_path_idx" ON "presentations_blocks_card_grid" USING btree ("_path");
  CREATE INDEX "presentations_blocks_stats_stats_order_idx" ON "presentations_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "presentations_blocks_stats_stats_parent_id_idx" ON "presentations_blocks_stats_stats" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_stats_order_idx" ON "presentations_blocks_stats" USING btree ("_order");
  CREATE INDEX "presentations_blocks_stats_parent_id_idx" ON "presentations_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_stats_path_idx" ON "presentations_blocks_stats" USING btree ("_path");
  CREATE INDEX "presentations_blocks_quotes_quotes_order_idx" ON "presentations_blocks_quotes_quotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_quotes_quotes_parent_id_idx" ON "presentations_blocks_quotes_quotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_quotes_order_idx" ON "presentations_blocks_quotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_quotes_parent_id_idx" ON "presentations_blocks_quotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_quotes_path_idx" ON "presentations_blocks_quotes" USING btree ("_path");
  CREATE INDEX "presentations_blocks_cta_order_idx" ON "presentations_blocks_cta" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cta_parent_id_idx" ON "presentations_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cta_path_idx" ON "presentations_blocks_cta" USING btree ("_path");
  CREATE INDEX "presentations_blocks_table_columns_order_idx" ON "presentations_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "presentations_blocks_table_columns_parent_id_idx" ON "presentations_blocks_table_columns" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_table_rows_cells_order_idx" ON "presentations_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "presentations_blocks_table_rows_cells_parent_id_idx" ON "presentations_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_table_rows_order_idx" ON "presentations_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "presentations_blocks_table_rows_parent_id_idx" ON "presentations_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_table_order_idx" ON "presentations_blocks_table" USING btree ("_order");
  CREATE INDEX "presentations_blocks_table_parent_id_idx" ON "presentations_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_table_path_idx" ON "presentations_blocks_table" USING btree ("_path");
  CREATE INDEX "presentations_blocks_timeline_steps_order_idx" ON "presentations_blocks_timeline_steps" USING btree ("_order");
  CREATE INDEX "presentations_blocks_timeline_steps_parent_id_idx" ON "presentations_blocks_timeline_steps" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_timeline_order_idx" ON "presentations_blocks_timeline" USING btree ("_order");
  CREATE INDEX "presentations_blocks_timeline_parent_id_idx" ON "presentations_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_timeline_path_idx" ON "presentations_blocks_timeline" USING btree ("_path");
  CREATE INDEX "presentations_blocks_markdown_order_idx" ON "presentations_blocks_markdown" USING btree ("_order");
  CREATE INDEX "presentations_blocks_markdown_parent_id_idx" ON "presentations_blocks_markdown" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_markdown_path_idx" ON "presentations_blocks_markdown" USING btree ("_path");
  CREATE UNIQUE INDEX "presentations_slug_idx" ON "presentations" USING btree ("slug");
  CREATE INDEX "presentations_pdf_file_idx" ON "presentations" USING btree ("pdf_file_id");
  CREATE INDEX "presentations_cover_image_idx" ON "presentations" USING btree ("cover_image_id");
  CREATE INDEX "presentations_created_by_idx" ON "presentations" USING btree ("created_by_id");
  CREATE INDEX "presentations_updated_at_idx" ON "presentations" USING btree ("updated_at");
  CREATE INDEX "presentations_created_at_idx" ON "presentations" USING btree ("created_at");
  CREATE INDEX "presentations_texts_order_parent" ON "presentations_texts" USING btree ("order","parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "share_links_presentation_idx" ON "share_links" USING btree ("presentation_id");
  CREATE UNIQUE INDEX "share_links_token_hash_idx" ON "share_links" USING btree ("token_hash");
  CREATE INDEX "share_links_created_by_idx" ON "share_links" USING btree ("created_by_id");
  CREATE INDEX "share_links_updated_at_idx" ON "share_links" USING btree ("updated_at");
  CREATE INDEX "share_links_created_at_idx" ON "share_links" USING btree ("created_at");
  CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");
  CREATE INDEX "accounts_updated_at_idx" ON "accounts" USING btree ("updated_at");
  CREATE INDEX "accounts_created_at_idx" ON "accounts" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_presentations_id_idx" ON "payload_locked_documents_rels" USING btree ("presentations_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_share_links_id_idx" ON "payload_locked_documents_rels" USING btree ("share_links_id");
  CREATE INDEX "payload_locked_documents_rels_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("accounts_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "presentations_blocks_cover" CASCADE;
  DROP TABLE "presentations_blocks_section" CASCADE;
  DROP TABLE "presentations_blocks_statement" CASCADE;
  DROP TABLE "presentations_blocks_two_cols_right_cards" CASCADE;
  DROP TABLE "presentations_blocks_two_cols" CASCADE;
  DROP TABLE "presentations_blocks_card_grid_cards" CASCADE;
  DROP TABLE "presentations_blocks_card_grid" CASCADE;
  DROP TABLE "presentations_blocks_stats_stats" CASCADE;
  DROP TABLE "presentations_blocks_stats" CASCADE;
  DROP TABLE "presentations_blocks_quotes_quotes" CASCADE;
  DROP TABLE "presentations_blocks_quotes" CASCADE;
  DROP TABLE "presentations_blocks_cta" CASCADE;
  DROP TABLE "presentations_blocks_table_columns" CASCADE;
  DROP TABLE "presentations_blocks_table_rows_cells" CASCADE;
  DROP TABLE "presentations_blocks_table_rows" CASCADE;
  DROP TABLE "presentations_blocks_table" CASCADE;
  DROP TABLE "presentations_blocks_timeline_steps" CASCADE;
  DROP TABLE "presentations_blocks_timeline" CASCADE;
  DROP TABLE "presentations_blocks_markdown" CASCADE;
  DROP TABLE "presentations" CASCADE;
  DROP TABLE "presentations_texts" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "share_links" CASCADE;
  DROP TABLE "accounts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_presentations_blocks_cover_surface";
  DROP TYPE "public"."enum_presentations_blocks_cover_image_position";
  DROP TYPE "public"."enum_presentations_blocks_section_surface";
  DROP TYPE "public"."enum_presentations_blocks_section_image_position";
  DROP TYPE "public"."enum_presentations_blocks_two_cols_image_position";
  DROP TYPE "public"."enum_presentations_blocks_card_grid_columns";
  DROP TYPE "public"."enum_presentations_blocks_stats_surface";
  DROP TYPE "public"."enum_presentations_blocks_table_surface";
  DROP TYPE "public"."enum_presentations_blocks_timeline_surface";
  DROP TYPE "public"."enum_presentations_language";
  DROP TYPE "public"."enum_presentations_last_build_status";
  DROP TYPE "public"."enum_presentations_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
