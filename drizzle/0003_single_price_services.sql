DROP TABLE "service_packages" CASCADE;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "price" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "billing" "service_billing" DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;