ALTER TABLE "conversations" ADD COLUMN "whatsapp_phone_number_id" varchar(100);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "whatsapp_phone_number_id" varchar(100);--> statement-breakpoint
UPDATE "messages" AS "message"
SET "whatsapp_phone_number_id" = "event"."phone_number_id"
FROM "whatsapp_webhook_events" AS "event"
WHERE "message"."provider_message_id" = "event"."provider_message_id"
	AND "message"."direction" = 'inbound'
	AND "event"."event_type" = 'message.received'
	AND "event"."phone_number_id" IS NOT NULL;--> statement-breakpoint
UPDATE "conversations" AS "conversation"
SET "whatsapp_phone_number_id" = "latest"."whatsapp_phone_number_id"
FROM (
	SELECT DISTINCT ON ("conversation_id")
		"conversation_id",
		"whatsapp_phone_number_id"
	FROM "messages"
	WHERE "whatsapp_phone_number_id" IS NOT NULL
	ORDER BY "conversation_id", "created_at" DESC
) AS "latest"
WHERE "conversation"."id" = "latest"."conversation_id";