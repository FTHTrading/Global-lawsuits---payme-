CREATE TABLE IF NOT EXISTS "extracted_facts_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"extracted_data" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"status" varchar(32) DEFAULT 'pending',
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "review_status" varchar(32) DEFAULT 'unreviewed';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_facts_staging" ADD CONSTRAINT "extracted_facts_staging_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
