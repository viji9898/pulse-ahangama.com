CREATE TYPE "public"."campaign_type" AS ENUM('whats_on_today', 'venue_feature', 'wellness_pick');--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "campaign_type" "campaign_type";--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "content_payload" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "template_variables" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "campaigns"
SET
	"campaign_type" = 'venue_feature',
	"content_payload" = jsonb_build_object(
		'type', 'venue_feature',
		'venueName', COALESCE("name", 'Ahangama campaign'),
		'description', 'Migrated campaign content',
		'offer', 'Campaign offer',
		'url', 'https://pulse.ahangama.com'
	)
WHERE "campaign_type" IS NULL OR "content_payload" IS NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "campaign_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "content_payload" SET NOT NULL;