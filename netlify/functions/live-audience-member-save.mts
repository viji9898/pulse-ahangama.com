import type { Config } from "@netlify/functions";
import { getLiveAudienceMembers, saveLiveAudienceMember } from "./_shared/live-audiences.js";

type RequestBody = {
  audienceId?: string;
  memberId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  phoneNumber?: string | null;
  whatsappOptIn?: boolean;
  emailOptIn?: boolean;
  memberType?: string | null;
  audienceType?: string | null;
  sourceHotelSlug?: string | null;
  country?: string | null;
  destination?: string | null;
  venueName?: string | null;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  try {
    const body = (await request.json()) as RequestBody;

    if (!body.audienceId) {
      return Response.json({ error: "audienceId is required" }, { status: 400 });
    }

    if (!body.email?.trim()) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    await saveLiveAudienceMember({
      audienceId: body.audienceId,
      memberId: body.memberId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      whatsappOptIn: body.whatsappOptIn,
      emailOptIn: body.emailOptIn,
      memberType: body.memberType,
      audienceType: body.audienceType,
      sourceHotelSlug: body.sourceHotelSlug,
      country: body.country,
      destination: body.destination,
      venueName: body.venueName,
    });

    const members = await getLiveAudienceMembers(body.audienceId);
    return Response.json({ ok: true, members: members ?? [] });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save live audience member" },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/live-audiences/member-save",
};