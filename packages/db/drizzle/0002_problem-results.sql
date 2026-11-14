ALTER TABLE "submissions" ADD COLUMN "sample_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "tests_passed" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "tests_total" integer;