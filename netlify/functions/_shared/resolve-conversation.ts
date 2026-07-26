import { and, eq } from "drizzle-orm";
import { conversations, guests } from "../../../db/schema/index.js";
import { db } from "./db.js";

type ResolveConversationInput = {
  phoneNumber: string;
  profileName?: string;
  whatsappPhoneNumberId?: string;
};

export async function resolveConversation({
  phoneNumber,
  profileName,
  whatsappPhoneNumberId,
}: ResolveConversationInput) {
  const normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");

  const existingGuest = await db
    .select()
    .from(guests)
    .where(eq(guests.normalizedPhoneNumber, normalizedPhoneNumber))
    .limit(1);

  let guest = existingGuest[0];

  if (!guest) {
    const [createdGuest] = await db
      .insert(guests)
      .values({
        firstName: profileName || "WhatsApp guest",
        phoneNumber: `+${normalizedPhoneNumber}`,
        normalizedPhoneNumber,
        whatsappOptIn: true,
      })
      .returning();

    guest = createdGuest;
  }

  const existingConversation = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.guestId, guest.id),
        eq(conversations.channel, "whatsapp"),
        whatsappPhoneNumberId
          ? eq(
              conversations.whatsappPhoneNumberId,
              whatsappPhoneNumberId,
            )
          : undefined,
      ),
    )
    .limit(1);

  let conversation = existingConversation[0];

  if (!conversation) {
    const [createdConversation] = await db
      .insert(conversations)
      .values({
        guestId: guest.id,
        channel: "whatsapp",
        status: "open",
        whatsappPhoneNumberId,
      })
      .returning();

    conversation = createdConversation;
  }

  return {
    guest,
    conversation,
  };
}
