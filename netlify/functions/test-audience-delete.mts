import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { testAudiences } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

type RequestBody = {
  audienceId?: string;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const body = (await request.json()) as RequestBody;

  if (!body.audienceId) {
    return Response.json({ error: "audienceId is required" }, { status: 400 });
  }

  const [deletedAudience] = await db
    .delete(testAudiences)
    .where(eq(testAudiences.id, body.audienceId))
    .returning();

  if (!deletedAudience) {
    return Response.json({ error: "Test audience not found" }, { status: 404 });
  }

  return Response.json({ ok: true, audienceId: body.audienceId });
};

export const config: Config = {
  path: "/api/test-audiences/delete",
};