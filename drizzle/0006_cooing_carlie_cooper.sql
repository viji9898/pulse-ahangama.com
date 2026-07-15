CREATE TYPE "public"."campaign_test_status" AS ENUM('queued', 'sending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "campaign_test_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_run_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"phone_number" varchar(40) NOT NULL,
	"status" "campaign_recipient_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" varchar(255),
	"error_message" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"audience_id" uuid NOT NULL,
	"status" "campaign_test_status" DEFAULT 'queued' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_audience_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "last_test_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "last_test_run_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "test_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaign_test_recipients" ADD CONSTRAINT "campaign_test_recipients_test_run_id_campaign_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."campaign_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_test_recipients" ADD CONSTRAINT "campaign_test_recipients_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_test_runs" ADD CONSTRAINT "campaign_test_runs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_test_runs" ADD CONSTRAINT "campaign_test_runs_audience_id_test_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."test_audiences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_audience_members" ADD CONSTRAINT "test_audience_members_audience_id_test_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."test_audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_audience_members" ADD CONSTRAINT "test_audience_members_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_test_recipient_unique" ON "campaign_test_recipients" USING btree ("test_run_id","guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_test_provider_message_unique" ON "campaign_test_recipients" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "campaign_test_runs_campaign_idx" ON "campaign_test_runs" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_audience_member_unique" ON "test_audience_members" USING btree ("audience_id","guest_id");--> statement-breakpoint
CREATE INDEX "test_audience_members_audience_idx" ON "test_audience_members" USING btree ("audience_id");