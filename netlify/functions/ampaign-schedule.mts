import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { campaigns, campaignTestRuns } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

type RequestBody = {
  campaignId?: string;
  scheduledAt?: string;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const input = (await request.json()) as RequestBody;

  if (!input.campaignId || !input.scheduledAt) {
    return Response.json(
      { error: "campaignId and scheduledAt are required" },
      { status: 400 },
    );
  }

  const scheduledAt = new Date(input.scheduledAt);

  if (
    Number.isNaN(scheduledAt.getTime()) ||
    scheduledAt.getTime() <= Date.now()
  ) {
    return Response.json(
      { error: "Schedule must be a valid future time" },
      { status: 400 },
    );
  }

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, input.campaignId))
    .limit(1);

  if (!campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.lastTestRunId) {
    return Response.json(
      { error: "Send a successful test before scheduling" },
      { status: 409 },
    );
  }

  const [testRun] = await db
    .select()
    .from(campaignTestRuns)
    .where(eq(campaignTestRuns.id, campaign.lastTestRunId))
    .limit(1);

  if (!testRun || testRun.status !== "completed" || testRun.sentCount < 1) {
    return Response.json(
      { error: "The latest test send was not successful" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      status: "scheduled",
      scheduledAt,
      testApprovedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaign.id))
    .returning();

  return Response.json({
    ok: true,
    campaign: updated,
  });
};

export const config: Config = {
  path: "/api/campaigns/schedule",
};
