import type { Config } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { conversations, guests } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  getWhatsAppPhoneNumberId,
  getWhatsAppSenderKey,
  type WhatsAppSenderKey,
} from "./_shared/whatsapp-client.js";

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
    const sender = new URL(request.url).searchParams.get("sender");

    if (sender && sender !== "ahangama" && sender !== "ahangama_pass") {
      return Response.json({ error: "Invalid sender filter" }, { status: 400 });
    }

    const phoneNumberId = sender
      ? getWhatsAppPhoneNumberId(sender as WhatsAppSenderKey)
      : null;
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
        whatsappPhoneNumberId: conversations.whatsappPhoneNumberId,
      })
      .from(conversations)
      .innerJoin(guests, eq(conversations.guestId, guests.id))
      .where(
        and(
          eq(conversations.channel, "whatsapp"),
          phoneNumberId
            ? eq(conversations.whatsappPhoneNumberId, phoneNumberId)
            : undefined,
        ),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(100);

    return Response.json({
      conversations: results.map(
        ({ whatsappPhoneNumberId, ...conversation }) => ({
          ...conversation,
          whatsappSenderKey: getWhatsAppSenderKey(whatsappPhoneNumberId),
        }),
      ),
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
