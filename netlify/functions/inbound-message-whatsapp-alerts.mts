import type { Config } from "@netlify/functions";
import { and, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { guests, messages } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  INBOUND_WHATSAPP_ALERT_RECIPIENT,
  sendInboundMessageWhatsAppAlert,
} from "./_shared/inbound-message-alert.js";
import { getWhatsAppSenderKey } from "./_shared/whatsapp-client.js";

const BATCH_SIZE = 20;
const CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

export default async (): Promise<Response> => {
  const startedAt = new Date();
  const staleClaim = new Date(startedAt.getTime() - CLAIM_TIMEOUT_MS);
  const candidates = await db
    .select({
      id: messages.id,
      body: messages.body,
      firstName: guests.firstName,
      lastName: guests.lastName,
      phoneNumber: guests.phoneNumber,
      whatsappPhoneNumberId: messages.whatsappPhoneNumberId,
    })
    .from(messages)
    .innerJoin(guests, eq(messages.guestId, guests.id))
    .where(
      and(
        eq(messages.direction, "inbound"),
        isNull(messages.whatsappAlertSentAt),
        or(
          isNull(messages.whatsappAlertProcessingAt),
          lt(messages.whatsappAlertProcessingAt, staleClaim),
        ),
        or(
          isNull(guests.normalizedPhoneNumber),
          ne(
            guests.normalizedPhoneNumber,
            INBOUND_WHATSAPP_ALERT_RECIPIENT.replace(/\D/g, ""),
          ),
        ),
      ),
    )
    .orderBy(messages.createdAt)
    .limit(BATCH_SIZE);

  let sent = 0;
  let failed = 0;

  await Promise.all(
    candidates.map(async (candidate) => {
      const claimed = await db
        .update(messages)
        .set({
          whatsappAlertProcessingAt: startedAt,
          whatsappAlertAttempts: sql`${messages.whatsappAlertAttempts} + 1`,
          whatsappAlertError: null,
        })
        .where(
          and(
            eq(messages.id, candidate.id),
            isNull(messages.whatsappAlertSentAt),
            or(
              isNull(messages.whatsappAlertProcessingAt),
              lt(messages.whatsappAlertProcessingAt, staleClaim),
            ),
          ),
        )
        .returning({ id: messages.id });

      if (claimed.length === 0) return;

      try {
        const senderKey = getWhatsAppSenderKey(candidate.whatsappPhoneNumberId);

        if (!senderKey) {
          throw new Error(
            `Unknown receiving WhatsApp phone number ID: ${candidate.whatsappPhoneNumberId || "missing"}`,
          );
        }

        const providerMessageId = await sendInboundMessageWhatsAppAlert({
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phoneNumber: candidate.phoneNumber,
          body: candidate.body,
          senderKey,
        });

        await db
          .update(messages)
          .set({
            whatsappAlertSentAt: new Date(),
            whatsappAlertProcessingAt: null,
            whatsappAlertError: null,
            whatsappAlertProviderMessageId: providerMessageId,
          })
          .where(eq(messages.id, candidate.id));
        sent += 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown WhatsApp alert error";

        console.error("Inbound message WhatsApp alert failed", {
          messageId: candidate.id,
          error: errorMessage,
        });

        await db
          .update(messages)
          .set({
            whatsappAlertProcessingAt: null,
            whatsappAlertError: errorMessage.slice(0, 2000),
          })
          .where(eq(messages.id, candidate.id));
        failed += 1;
      }
    }),
  );

  return Response.json({
    candidates: candidates.length,
    sent,
    failed,
  });
};

export const config: Config = {
  schedule: "* * * * *",
};
