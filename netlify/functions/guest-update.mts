import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { guests } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

type RequestBody = {
  guestId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  countryCode?: string | null;
  whatsappOptIn?: boolean;
  emailOptIn?: boolean;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "PATCH") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "PATCH" },
    });
  }

  const body = (await request.json()) as RequestBody;

  if (!body.guestId) {
    return Response.json({ error: "guestId is required" }, { status: 400 });
  }

  const [updatedGuest] = await db
    .update(guests)
    .set({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      countryCode: body.countryCode,
      whatsappOptIn: body.whatsappOptIn,
      emailOptIn: body.emailOptIn,
      updatedAt: new Date(),
    })
    .where(eq(guests.id, body.guestId))
    .returning();

  if (!updatedGuest) {
    return Response.json({ error: "Guest not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    guest: updatedGuest,
  });
};

export const config: Config = {
  path: "/api/guest",
};
