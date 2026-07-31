import type { Config } from "@netlify/functions";
import { deleteLiveAudienceMember, getLiveAudienceMembers } from "./_shared/live-audiences.js";

type RequestBody = {
  audienceId?: string;
  memberId?: string;
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

    if (!body.audienceId || !body.memberId) {
      return Response.json(
        { error: "audienceId and memberId are required" },
        { status: 400 },
      );
    }

    await deleteLiveAudienceMember(body.audienceId, body.memberId);
    const members = await getLiveAudienceMembers(body.audienceId);
    return Response.json({ ok: true, members: members ?? [] });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to delete live audience member" },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/live-audiences/member-delete",
};