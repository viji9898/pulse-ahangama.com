import { and, eq } from "drizzle-orm";
import { conversations, guests } from "../../../db/schema/index.js";
import { db } from "./db.js";

export async function resolveGuestConversation(guestId: string) {
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.id, guestId))
    .limit(1);

  if (!guest) {
    throw new Error("Guest not found");
  }

  const [existingConversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.guestId, guestId),
        eq(conversations.channel, "whatsapp"),
      ),
    )
    .limit(1);

  if (existingConversation) {
    return {
      guest,
      conversation: existingConversation,
    };
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      guestId,
      channel: "whatsapp",
      status: "open",
    })
    .returning();

  return {
    guest,
    conversation,
  };
}