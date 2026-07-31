import type { Config } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { conversations, guests } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  getWhatsAppPhoneNumberId,
  getWhatsAppSenderKey,
  type WhatsAppSenderKey,
} from "./_shared/whatsapp-client.js";

const INBOX_QUERY_RETRY_DELAYS_MS = [250, 750] as const;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function shouldRetryInboxQuery(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return true;
    }

    if (/fetch failed|Error connecting to database/i.test(error.message)) {
      return true;
    }
  }

  return false;
}

async function loadInboxConversations(phoneNumberId: string | null) {
  let lastError: unknown = null;

  for (
    let attempt = 0;
    attempt <= INBOX_QUERY_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      return await db
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
    } catch (error) {
      lastError = error;

      if (
        attempt === INBOX_QUERY_RETRY_DELAYS_MS.length ||
        !shouldRetryInboxQuery(error)
      ) {
        throw error;
      }

      await wait(INBOX_QUERY_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

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
    const results = await loadInboxConversations(phoneNumberId);

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
