import type { Config } from "@netlify/functions";
import { count, desc, eq } from "drizzle-orm";
import { testAudienceMembers, testAudiences } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const results = await db
    .select({
      id: testAudiences.id,
      name: testAudiences.name,
      description: testAudiences.description,
      active: testAudiences.active,
      memberCount: count(testAudienceMembers.id),
      createdAt: testAudiences.createdAt,
    })
    .from(testAudiences)
    .leftJoin(
      testAudienceMembers,
      eq(testAudienceMembers.audienceId, testAudiences.id),
    )
    .groupBy(testAudiences.id)
    .orderBy(desc(testAudiences.createdAt));

  return Response.json({ audiences: results });
};

export const config: Config = {
  path: "/api/test-audiences",
};
