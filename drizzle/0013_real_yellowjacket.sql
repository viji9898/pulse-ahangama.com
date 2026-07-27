ALTER TABLE "messages" ADD COLUMN "whatsapp_alert_processing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "whatsapp_alert_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "whatsapp_alert_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "whatsapp_alert_error" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "whatsapp_alert_provider_message_id" varchar(255);--> statement-breakpoint
UPDATE "messages"
SET "whatsapp_alert_sent_at" = now()
WHERE "direction" = 'inbound';--> statement-breakpoint
CREATE INDEX "messages_whatsapp_alert_idx" ON "messages" USING btree ("direction","whatsapp_alert_sent_at","whatsapp_alert_processing_at");