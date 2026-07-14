import type { Config } from "@netlify/functions";
import { asc, desc, eq } from "drizzle-orm";
import {
  conversations,
  guests,
  guestInterests,
  guestNotes,
  guestStays,
  messages,
} from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const url = new URL(request.url);
  const guestId = url.searchParams.get("guestId");

  if (!guestId) {
    return Response.json({ error: "guestId is required" }, { status: 400 });
  }

  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.id, guestId))
    .limit(1);

  if (!guest) {
    return Response.json({ error: "Guest not found" }, { status: 404 });
  }

  const [stays, interests, notes, guestMessages, guestConversations] =
    await Promise.all([
      db
        .select()
        .from(guestStays)
        .where(eq(guestStays.guestId, guestId))
        .orderBy(desc(guestStays.arrivalDate)),

      db
        .select()
        .from(guestInterests)
        .where(eq(guestInterests.guestId, guestId))
        .orderBy(asc(guestInterests.interest)),

      db
        .select()
        .from(guestNotes)
        .where(eq(guestNotes.guestId, guestId))
        .orderBy(desc(guestNotes.createdAt)),

      db
        .select()
        .from(messages)
        .where(eq(messages.guestId, guestId))
        .orderBy(desc(messages.createdAt))
        .limit(50),

      db.select().from(conversations).where(eq(conversations.guestId, guestId)),
    ]);

  return Response.json({
    guest,
    stays,
    interests,
    notes,
    messages: guestMessages,
    conversations: guestConversations,
  });
};

export const config: Config = {
  path: "/api/guest",
};
