import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'author', 'viewer');
  CREATE TYPE "public"."enum_presentations_tags" AS ENUM('pitch', 'formation', 'client');
  CREATE TYPE "public"."enum_presentations_blocks_cover_surface" AS ENUM('dark', 'light', 'gradient');
  CREATE TYPE "public"."enum_presentations_blocks_section_surface" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_presentations_blocks_card_grid_columns" AS ENUM('2', '3', '4');
  CREATE TYPE "public"."enum_presentations_blocks_stats_surface" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_presentations_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_presentations_language" AS ENUM('fr', 'en');
  CREATE TYPE "public"."enum_presentations_last_build_status" AS ENUM('idle', 'building', 'success', 'failed');
  CREATE TYPE "public"."enum_plugin_ai_instructions_field_type" AS ENUM('text', 'textarea', 'upload', 'richText');
  CREATE TYPE "public"."enum_plugin_ai_instructions_model_id" AS ENUM('ANTH-C-text', 'ANTH-C-object');
  CREATE TYPE "public"."enum_plugin_ai_instructions_anth_c_text_settings_model" AS ENUM('claude-opus-4-1', 'claude-opus-4-0', 'claude-sonnet-4-0', 'claude-3-opus-latest', 'claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest');
  CREATE TYPE "public"."enum_plugin_ai_instructions_anth_c_object_settings_model" AS ENUM('claude-opus-4-1', 'claude-opus-4-0', 'claude-sonnet-4-0', 'claude-3-opus-latest', 'claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest');
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
  
  CREATE TABLE "presentations_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_presentations_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_cover" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" varchar,
  	"footer_left" varchar,
  	"footer_right" varchar,
  	"surface" "enum_presentations_blocks_cover_surface" DEFAULT 'dark',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" varchar,
  	"surface" "enum_presentations_blocks_section_surface" DEFAULT 'dark',
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"footer" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_two_cols_right_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "presentations_blocks_two_cols" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"intro" varchar,
  	"left_footer" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "presentations_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"sidebar_text" varchar,
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
  
  CREATE TABLE "presentations_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar NOT NULL,
  	"author_name" varchar NOT NULL,
  	"author_role" varchar
  );
  
  CREATE TABLE "presentations_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"rating" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_offices_offices" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"region" varchar,
  	"label" varchar,
  	"specialties" varchar
  );
  
  CREATE TABLE "presentations_blocks_offices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_cta_contact_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "presentations_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"primary_action" varchar,
  	"secondary_action" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presentations_blocks_end" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wordmark" varchar,
  	"tagline" varchar,
  	"footer_note" varchar,
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
  	"client_id" integer,
  	"status" "enum_presentations_status" DEFAULT 'draft' NOT NULL,
  	"language" "enum_presentations_language" DEFAULT 'fr' NOT NULL,
  	"pdf_file_id" integer,
  	"spa_url" varchar,
  	"cover_image_id" integer,
  	"last_build_status" "enum_presentations_last_build_status" DEFAULT 'idle',
  	"last_build_error" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "clients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"logo_id" integer,
  	"color" varchar,
  	"notes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  	"presentation_id" integer NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"created_by_id" integer,
  	"view_count" numeric DEFAULT 0,
  	"last_viewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "plugin_ai_instructions_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "plugin_ai_instructions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"schema_path" varchar,
  	"field_type" "enum_plugin_ai_instructions_field_type" DEFAULT 'text',
  	"relation_to" varchar,
  	"model_id" "enum_plugin_ai_instructions_model_id",
  	"disabled" boolean DEFAULT false,
  	"prompt" varchar,
  	"system" varchar DEFAULT 'INSTRUCTIONS:
  You are a highly skilled and professional blog writer,
  renowned for crafting engaging and well-organized articles.
  When given a title, you meticulously create blogs that are not only
  informative and accurate but also captivating and beautifully structured.',
  	"layout" varchar DEFAULT '[paragraph] - Write a concise introduction (2-3 sentences) that outlines the main topic.
  [horizontalrule] - Insert a horizontal rule to separate the introduction from the main content.
  [list] - Create a list with 3-5 items. Each list item should contain:
     a. [heading] - A brief, descriptive heading (up to 5 words)
     b. [paragraph] - A short explanation or elaboration (1-2 sentences)
  [horizontalrule] - Insert another horizontal rule to separate the main content from the conclusion.
  [paragraph] - Compose a brief conclusion (2-3 sentences) summarizing the key points.
  [quote] - Include a relevant quote from a famous person, directly related to the topic. Format: "Quote text." - Author Name',
  	"anth_c_text_settings_model" "enum_plugin_ai_instructions_anth_c_text_settings_model" DEFAULT 'claude-3-5-sonnet-latest',
  	"anth_c_text_settings_max_tokens" numeric DEFAULT 5000,
  	"anth_c_text_settings_temperature" numeric DEFAULT 0.7,
  	"anth_c_text_settings_extract_attachments" boolean,
  	"anth_c_object_settings_model" "enum_plugin_ai_instructions_anth_c_object_settings_model" DEFAULT 'claude-3-5-sonnet-latest',
  	"anth_c_object_settings_max_tokens" numeric DEFAULT 5000,
  	"anth_c_object_settings_temperature" numeric DEFAULT 0.7,
  	"anth_c_object_settings_extract_attachments" boolean,
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
  	"clients_id" integer,
  	"media_id" integer,
  	"share_links_id" integer,
  	"plugin_ai_instructions_id" integer
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
  ALTER TABLE "presentations_tags" ADD CONSTRAINT "presentations_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cover" ADD CONSTRAINT "presentations_blocks_cover_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_section" ADD CONSTRAINT "presentations_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_statement" ADD CONSTRAINT "presentations_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_two_cols_right_cards" ADD CONSTRAINT "presentations_blocks_two_cols_right_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_two_cols"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_two_cols" ADD CONSTRAINT "presentations_blocks_two_cols_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid_cards" ADD CONSTRAINT "presentations_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_card_grid" ADD CONSTRAINT "presentations_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_stats_stats" ADD CONSTRAINT "presentations_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_stats" ADD CONSTRAINT "presentations_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_testimonials_quotes" ADD CONSTRAINT "presentations_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_testimonials" ADD CONSTRAINT "presentations_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_offices_offices" ADD CONSTRAINT "presentations_blocks_offices_offices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_offices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_offices" ADD CONSTRAINT "presentations_blocks_offices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cta_contact_rows" ADD CONSTRAINT "presentations_blocks_cta_contact_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_cta" ADD CONSTRAINT "presentations_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_end" ADD CONSTRAINT "presentations_blocks_end_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations_blocks_markdown" ADD CONSTRAINT "presentations_blocks_markdown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_pdf_file_id_media_id_fk" FOREIGN KEY ("pdf_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients" ADD CONSTRAINT "clients_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "share_links" ADD CONSTRAINT "share_links_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "plugin_ai_instructions_images" ADD CONSTRAINT "plugin_ai_instructions_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "plugin_ai_instructions_images" ADD CONSTRAINT "plugin_ai_instructions_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."plugin_ai_instructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_presentations_fk" FOREIGN KEY ("presentations_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clients_fk" FOREIGN KEY ("clients_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_share_links_fk" FOREIGN KEY ("share_links_id") REFERENCES "public"."share_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_plugin_ai_instructions_fk" FOREIGN KEY ("plugin_ai_instructions_id") REFERENCES "public"."plugin_ai_instructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "presentations_tags_order_idx" ON "presentations_tags" USING btree ("order");
  CREATE INDEX "presentations_tags_parent_idx" ON "presentations_tags" USING btree ("parent_id");
  CREATE INDEX "presentations_blocks_cover_order_idx" ON "presentations_blocks_cover" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cover_parent_id_idx" ON "presentations_blocks_cover" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cover_path_idx" ON "presentations_blocks_cover" USING btree ("_path");
  CREATE INDEX "presentations_blocks_section_order_idx" ON "presentations_blocks_section" USING btree ("_order");
  CREATE INDEX "presentations_blocks_section_parent_id_idx" ON "presentations_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_section_path_idx" ON "presentations_blocks_section" USING btree ("_path");
  CREATE INDEX "presentations_blocks_statement_order_idx" ON "presentations_blocks_statement" USING btree ("_order");
  CREATE INDEX "presentations_blocks_statement_parent_id_idx" ON "presentations_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_statement_path_idx" ON "presentations_blocks_statement" USING btree ("_path");
  CREATE INDEX "presentations_blocks_two_cols_right_cards_order_idx" ON "presentations_blocks_two_cols_right_cards" USING btree ("_order");
  CREATE INDEX "presentations_blocks_two_cols_right_cards_parent_id_idx" ON "presentations_blocks_two_cols_right_cards" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_two_cols_order_idx" ON "presentations_blocks_two_cols" USING btree ("_order");
  CREATE INDEX "presentations_blocks_two_cols_parent_id_idx" ON "presentations_blocks_two_cols" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_two_cols_path_idx" ON "presentations_blocks_two_cols" USING btree ("_path");
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
  CREATE INDEX "presentations_blocks_testimonials_quotes_order_idx" ON "presentations_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "presentations_blocks_testimonials_quotes_parent_id_idx" ON "presentations_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_testimonials_order_idx" ON "presentations_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "presentations_blocks_testimonials_parent_id_idx" ON "presentations_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_testimonials_path_idx" ON "presentations_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "presentations_blocks_offices_offices_order_idx" ON "presentations_blocks_offices_offices" USING btree ("_order");
  CREATE INDEX "presentations_blocks_offices_offices_parent_id_idx" ON "presentations_blocks_offices_offices" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_offices_order_idx" ON "presentations_blocks_offices" USING btree ("_order");
  CREATE INDEX "presentations_blocks_offices_parent_id_idx" ON "presentations_blocks_offices" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_offices_path_idx" ON "presentations_blocks_offices" USING btree ("_path");
  CREATE INDEX "presentations_blocks_cta_contact_rows_order_idx" ON "presentations_blocks_cta_contact_rows" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cta_contact_rows_parent_id_idx" ON "presentations_blocks_cta_contact_rows" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cta_order_idx" ON "presentations_blocks_cta" USING btree ("_order");
  CREATE INDEX "presentations_blocks_cta_parent_id_idx" ON "presentations_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_cta_path_idx" ON "presentations_blocks_cta" USING btree ("_path");
  CREATE INDEX "presentations_blocks_end_order_idx" ON "presentations_blocks_end" USING btree ("_order");
  CREATE INDEX "presentations_blocks_end_parent_id_idx" ON "presentations_blocks_end" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_end_path_idx" ON "presentations_blocks_end" USING btree ("_path");
  CREATE INDEX "presentations_blocks_markdown_order_idx" ON "presentations_blocks_markdown" USING btree ("_order");
  CREATE INDEX "presentations_blocks_markdown_parent_id_idx" ON "presentations_blocks_markdown" USING btree ("_parent_id");
  CREATE INDEX "presentations_blocks_markdown_path_idx" ON "presentations_blocks_markdown" USING btree ("_path");
  CREATE UNIQUE INDEX "presentations_slug_idx" ON "presentations" USING btree ("slug");
  CREATE INDEX "presentations_client_idx" ON "presentations" USING btree ("client_id");
  CREATE INDEX "presentations_pdf_file_idx" ON "presentations" USING btree ("pdf_file_id");
  CREATE INDEX "presentations_cover_image_idx" ON "presentations" USING btree ("cover_image_id");
  CREATE INDEX "presentations_created_by_idx" ON "presentations" USING btree ("created_by_id");
  CREATE INDEX "presentations_updated_at_idx" ON "presentations" USING btree ("updated_at");
  CREATE INDEX "presentations_created_at_idx" ON "presentations" USING btree ("created_at");
  CREATE UNIQUE INDEX "clients_slug_idx" ON "clients" USING btree ("slug");
  CREATE INDEX "clients_logo_idx" ON "clients" USING btree ("logo_id");
  CREATE INDEX "clients_updated_at_idx" ON "clients" USING btree ("updated_at");
  CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");
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
  CREATE INDEX "plugin_ai_instructions_images_order_idx" ON "plugin_ai_instructions_images" USING btree ("_order");
  CREATE INDEX "plugin_ai_instructions_images_parent_id_idx" ON "plugin_ai_instructions_images" USING btree ("_parent_id");
  CREATE INDEX "plugin_ai_instructions_images_image_idx" ON "plugin_ai_instructions_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "plugin_ai_instructions_schema_path_idx" ON "plugin_ai_instructions" USING btree ("schema_path");
  CREATE INDEX "plugin_ai_instructions_updated_at_idx" ON "plugin_ai_instructions" USING btree ("updated_at");
  CREATE INDEX "plugin_ai_instructions_created_at_idx" ON "plugin_ai_instructions" USING btree ("created_at");
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
  CREATE INDEX "payload_locked_documents_rels_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("clients_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_share_links_id_idx" ON "payload_locked_documents_rels" USING btree ("share_links_id");
  CREATE INDEX "payload_locked_documents_rels_plugin_ai_instructions_id_idx" ON "payload_locked_documents_rels" USING btree ("plugin_ai_instructions_id");
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
  DROP TABLE "presentations_tags" CASCADE;
  DROP TABLE "presentations_blocks_cover" CASCADE;
  DROP TABLE "presentations_blocks_section" CASCADE;
  DROP TABLE "presentations_blocks_statement" CASCADE;
  DROP TABLE "presentations_blocks_two_cols_right_cards" CASCADE;
  DROP TABLE "presentations_blocks_two_cols" CASCADE;
  DROP TABLE "presentations_blocks_card_grid_cards" CASCADE;
  DROP TABLE "presentations_blocks_card_grid" CASCADE;
  DROP TABLE "presentations_blocks_stats_stats" CASCADE;
  DROP TABLE "presentations_blocks_stats" CASCADE;
  DROP TABLE "presentations_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "presentations_blocks_testimonials" CASCADE;
  DROP TABLE "presentations_blocks_offices_offices" CASCADE;
  DROP TABLE "presentations_blocks_offices" CASCADE;
  DROP TABLE "presentations_blocks_cta_contact_rows" CASCADE;
  DROP TABLE "presentations_blocks_cta" CASCADE;
  DROP TABLE "presentations_blocks_end" CASCADE;
  DROP TABLE "presentations_blocks_markdown" CASCADE;
  DROP TABLE "presentations" CASCADE;
  DROP TABLE "clients" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "share_links" CASCADE;
  DROP TABLE "plugin_ai_instructions_images" CASCADE;
  DROP TABLE "plugin_ai_instructions" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_presentations_tags";
  DROP TYPE "public"."enum_presentations_blocks_cover_surface";
  DROP TYPE "public"."enum_presentations_blocks_section_surface";
  DROP TYPE "public"."enum_presentations_blocks_card_grid_columns";
  DROP TYPE "public"."enum_presentations_blocks_stats_surface";
  DROP TYPE "public"."enum_presentations_status";
  DROP TYPE "public"."enum_presentations_language";
  DROP TYPE "public"."enum_presentations_last_build_status";
  DROP TYPE "public"."enum_plugin_ai_instructions_field_type";
  DROP TYPE "public"."enum_plugin_ai_instructions_model_id";
  DROP TYPE "public"."enum_plugin_ai_instructions_anth_c_text_settings_model";
  DROP TYPE "public"."enum_plugin_ai_instructions_anth_c_object_settings_model";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
