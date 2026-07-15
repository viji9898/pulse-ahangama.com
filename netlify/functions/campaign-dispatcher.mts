import type { Config } from "@netlify/functions";
import { and, eq, lte } from "drizzle-orm";
import { campaigns } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

export default async (): Promise<Response> => {
  const dueCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, "scheduled"),
        lte(campaigns.scheduledAt, new Date()),
      ),
    )
    .limit(20);

  for (const campaign of dueCampaigns) {
    await db
      .update(campaigns)
      .set({
        status: "sending",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(campaigns.id, campaign.id), eq(campaigns.status, "scheduled")),
      );

    await fetch(
      `${process.env.URL}/.netlify/functions/campaign-send-background`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
        },
        body: JSON.stringify({
          campaignId: campaign.id,
        }),
      },
    );
  }

  return Response.json({
    dispatched: dueCampaigns.length,
  });
};

export const config: Config = {
  schedule: "* * * * *",
};
