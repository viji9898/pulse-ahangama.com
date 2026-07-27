CREATE TYPE "public"."campaign_kind" AS ENUM('campaign', 'quick_send');--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "kind" "campaign_kind" DEFAULT 'campaign' NOT NULL;