CREATE TABLE IF NOT EXISTS "case_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"title" text,
	"document_type" varchar(64),
	"source_url" text,
	"storage_path" text,
	"extracted_text" text,
	"mime_type" varchar(128),
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"source_id" text,
	"source_url" text,
	"case_name" text NOT NULL,
	"court" text,
	"docket_number" text,
	"filed_date" varchar(10),
	"updated_date" varchar(10),
	"defendants" jsonb DEFAULT '[]'::jsonb,
	"plaintiffs" jsonb DEFAULT '[]'::jsonb,
	"industry" text,
	"case_type" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"claim_deadline" varchar(10),
	"opt_out_deadline" varchar(10),
	"objection_deadline" varchar(10),
	"estimated_payout" jsonb,
	"settlement_amount" numeric,
	"eligibility_text" text,
	"class_definition" text,
	"class_period_start" varchar(10),
	"class_period_end" varchar(10),
	"geographic_restrictions" text,
	"claim_url" text,
	"proof_required" jsonb DEFAULT '[]'::jsonb,
	"ai_score" real DEFAULT 0,
	"match_score" real DEFAULT 0,
	"extraction_confidence" real DEFAULT 0,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"raw_text" text,
	"ai_summary" text,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(32) NOT NULL,
	"claim_url" text,
	"prefilled_data" jsonb,
	"evidence_files" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"filed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"date" varchar(10) NOT NULL,
	"description" text,
	"notified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"type" varchar(32) NOT NULL,
	"industry" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"source" varchar(32) NOT NULL,
	"model_used" text,
	"prompt_hash" text,
	"input_text_length" integer,
	"extracted_fields" jsonb,
	"confidence" real DEFAULT 0,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"case_id" uuid,
	"read" boolean DEFAULT false,
	"sent_via" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "possible_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"confidence" varchar(16) NOT NULL,
	"match_reasons" jsonb DEFAULT '[]'::jsonb,
	"match_score" real DEFAULT 0,
	"matched_fields" jsonb DEFAULT '[]'::jsonb,
	"dismissed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cases_found" integer DEFAULT 0,
	"cases_new" integer DEFAULT 0,
	"cases_updated" integer DEFAULT 0,
	"errors" integer DEFAULT 0,
	"error_details" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_auth_id" text,
	"display_name" text,
	"email_addresses" jsonb DEFAULT '[]'::jsonb,
	"phone_numbers" jsonb DEFAULT '[]'::jsonb,
	"mailing_addresses" jsonb DEFAULT '[]'::jsonb,
	"merchants" jsonb DEFAULT '[]'::jsonb,
	"products" jsonb DEFAULT '[]'::jsonb,
	"brokerages" jsonb DEFAULT '[]'::jsonb,
	"employers" jsonb DEFAULT '[]'::jsonb,
	"uploaded_evidence" jsonb DEFAULT '[]'::jsonb,
	"mode" varchar(32) DEFAULT 'personal',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_external_auth_id_unique" UNIQUE("external_auth_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "possible_matches" ADD CONSTRAINT "possible_matches_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "possible_matches" ADD CONSTRAINT "possible_matches_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_source_idx" ON "cases" ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_status_idx" ON "cases" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_case_type_idx" ON "cases" ("case_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_claim_deadline_idx" ON "cases" ("claim_deadline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_ai_score_idx" ON "cases" ("ai_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_source_id_idx" ON "cases" ("source","source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deadlines_date_idx" ON "deadlines" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_name_idx" ON "entities" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_user_idx" ON "possible_matches" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_case_idx" ON "possible_matches" ("case_id");