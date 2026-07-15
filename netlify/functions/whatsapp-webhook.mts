import crypto from "node:crypto";
import type { Config } from "@netlify/functions";
import { eq, sql } from "drizzle-orm";
import {
  campaignTestRecipients,
  conversations,
  messages,
  whatsappWebhookEvents,
} from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import { env } from "./_shared/env.js";
import { resolveConversation } from "./_shared/resolve-conversation.js";
import type { WhatsAppWebhookPayload } from "./_shared/whatsapp-types.js";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", env.metaAppSecret)
    .update(rawBody, "utf8")
    .digest();

  const receivedHex = signatureHeader.slice("sha256=".length);

  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) {
    return false;
  }

  const received = Buffer.from(receivedHex, "hex");

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

async function saveWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
  providerMessageId?: string,
  phoneNumberId?: string,
): Promise<void> {
  await db.insert(whatsappWebhookEvents).values({
    eventType,
    providerMessageId,
    phoneNumberId,
    payload,
  });
}

async function processPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      for (const incomingMessage of value?.messages ?? []) {
        await saveWebhookEvent(
          "message.received",
          incomingMessage as unknown as Record<string, unknown>,
          incomingMessage.id,
          phoneNumberId,
        );

        if (!incomingMessage.from || !incomingMessage.id) {
          continue;
        }

        console.log("Processing inbound WhatsApp message", {
          from: incomingMessage.from,
          id: incomingMessage.id,
          type: incomingMessage.type,
          phoneNumberId,
        });

        const contact = value?.contacts?.find(
          (item) => item.wa_id === incomingMessage.from,
        );

        const profileName = contact?.profile?.name;

        console.log("Resolving WhatsApp conversation", {
          phoneNumber: incomingMessage.from,
          profileName,
        });

        const { guest, conversation } = await resolveConversation({
          phoneNumber: incomingMessage.from,
          profileName,
        });

        console.log("Resolved WhatsApp conversation", {
          guestId: guest.id,
          conversationId: conversation.id,
        });

        const messageBody =
          incomingMessage.text?.body ||
          `[${incomingMessage.type || "unknown"} message]`;

        const messageTimestamp = incomingMessage.timestamp
          ? new Date(Number(incomingMessage.timestamp) * 1000)
          : new Date();

        const insertedMessages = await db
          .insert(messages)
          .values({
            conversationId: conversation.id,
            guestId: guest.id,
            channel: "whatsapp",
            direction: "inbound",
            status: "delivered",
            providerMessageId: incomingMessage.id,
            messageType: incomingMessage.type || "unknown",
            body: messageBody,
            deliveredAt: messageTimestamp,
            providerPayload: incomingMessage as unknown as Record<
              string,
              unknown
            >,
          })
          .onConflictDoNothing({
            target: messages.providerMessageId,
          })
          .returning({ id: messages.id });

        if (insertedMessages.length > 0) {
          await db
            .update(conversations)
            .set({
              status: "open",
              lastMessagePreview: messageBody.slice(0, 250),
              lastMessageAt: messageTimestamp,
              serviceWindowEndsAt: new Date(
                messageTimestamp.getTime() + 24 * 60 * 60 * 1000,
              ),
              unreadCount: sql`
                ${conversations.unreadCount} + 1
              `,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));
        }
      }

      for (const statusEvent of value?.statuses ?? []) {
        await saveWebhookEvent(
          `message.${statusEvent.status ?? "unknown"}`,
          statusEvent as unknown as Record<string, unknown>,
          statusEvent.id,
          phoneNumberId,
        );

        if (!statusEvent.id || !statusEvent.status) continue;

        const update: Partial<typeof messages.$inferInsert> = {
          status: statusEvent.status,
        };

        const timestamp = statusEvent.timestamp
          ? new Date(Number(statusEvent.timestamp) * 1000)
          : new Date();

        if (statusEvent.status === "sent") {
          update.sentAt = timestamp;
        }

        if (statusEvent.status === "delivered") {
          update.deliveredAt = timestamp;
        }

        if (statusEvent.status === "read") {
          update.readAt = timestamp;
        }

        if (statusEvent.status === "failed") {
          update.failedAt = timestamp;
        }

        await db
          .update(messages)
          .set(update)
          .where(eq(messages.providerMessageId, statusEvent.id));

        await db
          .update(campaignTestRecipients)
          .set({
            status: statusEvent.status,
            ...(statusEvent.status === "delivered"
              ? { deliveredAt: timestamp }
              : {}),
            ...(statusEvent.status === "read" ? { readAt: timestamp } : {}),
            ...(statusEvent.status === "failed"
              ? { failedAt: timestamp }
              : {}),
          })
          .where(
            eq(campaignTestRecipients.providerMessageId, statusEvent.id),
          );
      }
    }
  }
}

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === env.whatsappWebhookVerifyToken &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET, POST",
      },
    });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  console.log("WhatsApp webhook POST received", {
    hasSignature: Boolean(signature),
    bodyLength: rawBody.length,
  });

  if (!verifyMetaSignature(rawBody, signature)) {
    console.warn("Rejected WhatsApp webhook with invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  console.log("WhatsApp webhook payload", {
    object: payload.object,
    entryCount: payload.entry?.length ?? 0,
    entryIds: payload.entry?.map((entry) => entry.id),
  });

  if (payload.object !== "whatsapp_business_account") {
    return json({ received: true, ignored: true });
  }

  try {
    await processPayload(payload);
    return json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook processing failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 500 so Meta can retry delivery.
    return json({ error: "Webhook processing failed" }, 500);
  }
};

export const config: Config = {
  path: "/api/webhooks/whatsapp",
};
