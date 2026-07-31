import type { Config } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { guests, testAudienceMembers } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import { getLiveAudienceMembers } from "./_shared/live-audiences.js";

export default async (request: Request): Promise<Response> => {
  const audienceId = new URL(request.url).searchParams.get("audienceId");

  if (!audienceId) {
    return Response.json({ error: "audienceId is required" }, { status: 400 });
  }

  const liveAudienceMembers = await getLiveAudienceMembers(audienceId);

  if (liveAudienceMembers) {
    return Response.json({ members: liveAudienceMembers });
  }

  const members = await db
    .select({
      guestId: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      phoneNumber: guests.phoneNumber,
      normalizedPhoneNumber: guests.normalizedPhoneNumber,
      whatsappOptIn: guests.whatsappOptIn,
      emailOptIn: guests.emailOptIn,
    })
    .from(testAudienceMembers)
    .innerJoin(guests, eq(testAudienceMembers.guestId, guests.id))
    .where(eq(testAudienceMembers.audienceId, audienceId))
    .orderBy(asc(guests.firstName));

  return Response.json({ members });
};

export const config: Config = {
  path: "/api/test-audiences/members",
};
