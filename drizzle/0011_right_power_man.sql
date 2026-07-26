ALTER TABLE "messages" ADD COLUMN "email_alert_processing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "email_alert_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "email_alert_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "email_alert_error" text;--> statement-breakpoint
UPDATE "messages" SET "email_alert_sent_at" = NOW() WHERE "direction" = 'inbound';--> statement-breakpoint
CREATE INDEX "messages_email_alert_idx" ON "messages" USING btree ("direction","email_alert_sent_at","email_alert_processing_at");