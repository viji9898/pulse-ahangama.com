import type { Config } from "@netlify/functions";
import { testAudienceMembers, testAudiences } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

type RequestBody = {
  name?: string;
  description?: string;
  guestIds?: string[];
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const input = (await request.json()) as RequestBody;
  const name = input.name?.trim();
  const guestIds = [...new Set(input.guestIds ?? [])];

  if (!name) {
    return Response.json(
      { error: "Audience name is required" },
      { status: 400 },
    );
  }

  if (!guestIds.length || guestIds.length > 20) {
    return Response.json(
      {
        error: "A test audience must contain between 1 and 20 guests",
      },
      { status: 400 },
    );
  }

  const audience = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(testAudiences)
      .values({
        name,
        description: input.description?.trim() || null,
      })
      .returning();

    await tx.insert(testAudienceMembers).values(
      guestIds.map((guestId) => ({
        audienceId: created.id,
        guestId,
      })),
    );

    return created;
  });

  return Response.json(
    {
      ok: true,
      audience,
      memberCount: guestIds.length,
    },
    { status: 201 },
  );
};

export const config: Config = {
  path: "/api/test-audiences/create",
};
