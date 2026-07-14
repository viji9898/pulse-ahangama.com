CREATE TABLE "whatsapp_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"provider_message_id" varchar(255),
	"phone_number_id" varchar(100),
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processing_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_provider_message_idx" ON "whatsapp_webhook_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_received_idx" ON "whatsapp_webhook_events" USING btree ("received_at");