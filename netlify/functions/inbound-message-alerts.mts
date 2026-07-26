import type { Config } from "@netlify/functions";
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { guests, messages } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  buildInboundMessageEmail,
  sendInboundMessageEmail,
} from "./_shared/inbound-message-alert.js";

const BATCH_SIZE = 20;
const CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

export default async (): Promise<Response> => {
  const startedAt = new Date();
  const staleClaim = new Date(startedAt.getTime() - CLAIM_TIMEOUT_MS);
  const candidates = await db
    .select({
      id: messages.id,
      guestId: messages.guestId,
      body: messages.body,
      createdAt: messages.createdAt,
      firstName: guests.firstName,
      lastName: guests.lastName,
      phoneNumber: guests.phoneNumber,
    })
    .from(messages)
    .innerJoin(guests, eq(messages.guestId, guests.id))
    .where(
      and(
        eq(messages.direction, "inbound"),
        isNull(messages.emailAlertSentAt),
        or(
          isNull(messages.emailAlertProcessingAt),
          lt(messages.emailAlertProcessingAt, staleClaim),
        ),
      ),
    )
    .orderBy(asc(messages.createdAt))
    .limit(BATCH_SIZE);

  const groups = new Map<string, typeof candidates>();

  for (const candidate of candidates) {
    const group = groups.get(candidate.guestId) ?? [];
    group.push(candidate);
    groups.set(candidate.guestId, group);
  }

  let sentMessages = 0;
  let failedMessages = 0;

  await Promise.all(
    [...groups].map(async ([guestId, group]) => {
      const candidateIds = group.map((message) => message.id);
      const claimed = await db
        .update(messages)
        .set({
          emailAlertProcessingAt: startedAt,
          emailAlertAttempts: sql`${messages.emailAlertAttempts} + 1`,
          emailAlertError: null,
        })
        .where(
          and(
            inArray(messages.id, candidateIds),
            isNull(messages.emailAlertSentAt),
            or(
              isNull(messages.emailAlertProcessingAt),
              lt(messages.emailAlertProcessingAt, staleClaim),
            ),
          ),
        )
        .returning({ id: messages.id });
      const claimedIds = new Set(claimed.map((message) => message.id));
      const claimedMessages = group.filter((message) =>
        claimedIds.has(message.id),
      );

      if (claimedMessages.length === 0) return;

      try {
        await sendInboundMessageEmail(
          buildInboundMessageEmail({
            firstName: claimedMessages[0].firstName,
            lastName: claimedMessages[0].lastName,
            phoneNumber: claimedMessages[0].phoneNumber,
            messages: claimedMessages.map((message) => ({
              body: message.body,
              createdAt: message.createdAt,
            })),
          }),
        );

        await db
          .update(messages)
          .set({
            emailAlertSentAt: new Date(),
            emailAlertProcessingAt: null,
            emailAlertError: null,
          })
          .where(inArray(messages.id, [...claimedIds]));
        sentMessages += claimedMessages.length;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown email alert error";

        console.error("Inbound message email alert failed", {
          guestId,
          messageCount: claimedMessages.length,
          error: errorMessage,
        });

        await db
          .update(messages)
          .set({
            emailAlertProcessingAt: null,
            emailAlertError: errorMessage.slice(0, 2000),
          })
          .where(inArray(messages.id, [...claimedIds]));
        failedMessages += claimedMessages.length;
      }
    }),
  );

  return Response.json({
    candidates: candidates.length,
    sent: sentMessages,
    failed: failedMessages,
  });
};

export const config: Config = {
  schedule: "*/10 * * * *",
};