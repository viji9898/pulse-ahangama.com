import crypto from "node:crypto";
import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { messages, whatsappWebhookEvents } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import { env } from "./_shared/env.js";
import type { WhatsAppWebhookPayload } from "./_shared/whatsapp-types.js";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac("sha256", env.metaAppSecret)
    .update(rawBody)
    .digest("hex");

  const receivedSignature = signatureHeader.replace("sha256=", "");

  if (expectedSignature.length !== receivedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature),
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

        // In the next step we will resolve/create the guest and conversation,
        // then insert the inbound message into the messages table.
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

  if (payload.object !== "whatsapp_business_account") {
    return json({ received: true, ignored: true });
  }

  try {
    await processPayload(payload);
    return json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook processing failed", error);

    // Return 500 so Meta can retry delivery.
    return json({ error: "Webhook processing failed" }, 500);
  }
};

export const config: Config = {
  path: "/api/webhooks/whatsapp",
};
