ALTER TABLE "campaigns" ALTER COLUMN "estimated_meta_cost_usd" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "estimated_meta_cost_usd" SET DEFAULT '0';