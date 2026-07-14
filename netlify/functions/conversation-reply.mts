import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { conversations, guests, messages } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import { sendTextMessage } from "./_shared/whatsapp-client.js";

type RequestBody = {
  conversationId?: string;
  body?: string;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let input: RequestBody;

  try {
    input = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const conversationId = input.conversationId;
  const messageBody = input.body?.trim();

  if (!conversationId || !messageBody) {
    return Response.json(
      { error: "conversationId and body are required" },
      { status: 400 },
    );
  }

  if (messageBody.length > 4096) {
    return Response.json(
      { error: "Message must be 4096 characters or fewer" },
      { status: 400 },
    );
  }

  const [conversation] = await db
    .select({
      id: conversations.id,
      guestId: guests.id,
      phoneNumber: guests.phoneNumber,
      serviceWindowEndsAt: conversations.serviceWindowEndsAt,
    })
    .from(conversations)
    .innerJoin(guests, eq(conversations.guestId, guests.id))
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (!conversation.phoneNumber) {
    return Response.json(
      { error: "Guest has no WhatsApp phone number" },
      { status: 400 },
    );
  }

  const serviceWindowOpen =
    conversation.serviceWindowEndsAt &&
    conversation.serviceWindowEndsAt.getTime() > Date.now();

  if (!serviceWindowOpen) {
    return Response.json(
      {
        error:
          "The 24-hour service window has closed. Use an approved template.",
        code: "SERVICE_WINDOW_CLOSED",
      },
      { status: 409 },
    );
  }

  const [pendingMessage] = await db
    .insert(messages)
    .values({
      conversationId,
      guestId: conversation.guestId,
      channel: "whatsapp",
      direction: "outbound",
      status: "queued",
      messageType: "text",
      body: messageBody,
      providerPayload: {},
    })
    .returning();

  try {
    const result = await sendTextMessage({
      to: conversation.phoneNumber,
      body: messageBody,
    });

    const providerMessageId = result.messages?.[0]?.id;

    if (!providerMessageId) {
      throw new Error("Meta did not return a message ID");
    }

    const [updatedMessage] = await db
      .update(messages)
      .set({
        providerMessageId,
        status: "sent",
        sentAt: new Date(),
        providerPayload: result as unknown as Record<string, unknown>,
      })
      .where(eq(messages.id, pendingMessage.id))
      .returning();

    await db
      .update(conversations)
      .set({
        lastMessagePreview: messageBody.slice(0, 250),
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return Response.json({
      ok: true,
      message: updatedMessage,
    });
  } catch (error) {
    await db
      .update(messages)
      .set({
        status: "failed",
        failedAt: new Date(),
        providerPayload: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      .where(eq(messages.id, pendingMessage.id));

    console.error("WhatsApp reply failed", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to send reply",
      },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/conversation/reply",
};
