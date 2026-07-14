import type { Config } from "@netlify/functions";
import { and, asc, desc, ilike, or, sql } from "drizzle-orm";
import { conversations, guests, guestStays } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status");

  const filters = [];

  if (search) {
    filters.push(
      or(
        ilike(guests.firstName, `%${search}%`),
        ilike(guests.lastName, `%${search}%`),
        ilike(guests.email, `%${search}%`),
        ilike(guests.phoneNumber, `%${search}%`),
      ),
    );
  }

  if (status === "whatsapp-opted-in") {
    filters.push(sql`${guests.whatsappOptIn} = true`);
  }

  const results = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phoneNumber: guests.phoneNumber,
      countryCode: guests.countryCode,
      whatsappOptIn: guests.whatsappOptIn,
      emailOptIn: guests.emailOptIn,
      accommodationName: guestStays.accommodationName,
      arrivalDate: guestStays.arrivalDate,
      departureDate: guestStays.departureDate,
      lastMessageAt: conversations.lastMessageAt,
      conversationStatus: conversations.status,
      createdAt: guests.createdAt,
    })
    .from(guests)
    .leftJoin(guestStays, sql`${guestStays.guestId} = ${guests.id}`)
    .leftJoin(conversations, sql`${conversations.guestId} = ${guests.id}`)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(conversations.lastMessageAt), asc(guests.firstName))
    .limit(250);

  return Response.json({
    guests: results,
  });
};

export const config: Config = {
  path: "/api/guests",
};
