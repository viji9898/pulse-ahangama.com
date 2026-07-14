import type { Config } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { conversations, guests, messages } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");

  if (!conversationId) {
    return Response.json(
      {
        error: "conversationId is required",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const [conversation] = await db
      .select({
        id: conversations.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        phoneNumber: guests.phoneNumber,
        unreadCount: conversations.unreadCount,
        lastMessagePreview: conversations.lastMessagePreview,
        lastMessageAt: conversations.lastMessageAt,
        serviceWindowEndsAt: conversations.serviceWindowEndsAt,
      })
      .from(conversations)
      .innerJoin(guests, eq(conversations.guestId, guests.id))
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      return Response.json(
        {
          error: "Conversation not found",
        },
        {
          status: 404,
        },
      );
    }

    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return Response.json({
      conversation,
      messages: results,
    });
  } catch (error) {
    console.error("Conversation messages failed", error);

    return Response.json(
      {
        error: "Unable to load messages",
      },
      {
        status: 500,
      },
    );
  }
};

export const config: Config = {
  path: "/api/conversation/messages",
};
