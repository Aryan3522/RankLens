CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"url" text NOT NULL,
	"type" text DEFAULT 'website' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"seo_score" integer,
	"issue_count" integer,
	"meta_title" text,
	"meta_description" text,
	"h1_count" integer,
	"h2_count" integer,
	"word_count" integer,
	"internal_links" integer,
	"external_links" integer,
	"images_missing_alt" integer,
	"page_load_score" integer,
	"mobile_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "seo_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" integer NOT NULL,
	"category" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"affected_url" text,
	"element" text,
	"line_number" integer,
	"fix_example" text,
	"help_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" integer NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"estimated_impact" integer DEFAULT 0 NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_rank_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer NOT NULL,
	"rank" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"keyword" text NOT NULL,
	"current_rank" integer,
	"previous_rank" integer,
	"search_volume" integer,
	"difficulty" integer,
	"trend" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_rank_history" ADD CONSTRAINT "keyword_rank_history_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");