import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { conversations, guests } from "../../db/schema/index.js";
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

  try {
    const results = await db
      .select({
        id: conversations.id,
        guestId: guests.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        phoneNumber: guests.phoneNumber,
        status: conversations.status,
        unreadCount: conversations.unreadCount,
        lastMessagePreview: conversations.lastMessagePreview,
        lastMessageAt: conversations.lastMessageAt,
        serviceWindowEndsAt: conversations.serviceWindowEndsAt,
      })
      .from(conversations)
      .innerJoin(guests, eq(conversations.guestId, guests.id))
      .where(eq(conversations.channel, "whatsapp"))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(100);

    return Response.json({
      conversations: results,
    });
  } catch (error) {
    console.error("Inbox list failed", error);

    return Response.json(
      {
        error: "Unable to load inbox",
      },
      {
        status: 500,
      },
    );
  }
};

export const config: Config = {
  path: "/api/inbox",
};
