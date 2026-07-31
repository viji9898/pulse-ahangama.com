import type { Config } from "@netlify/functions";
import { and, eq, lte } from "drizzle-orm";
import { campaigns } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import { triggerCampaignSendBackground } from "./_shared/internal-api.js";

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
    const [claimedCampaign] = await db
      .update(campaigns)
      .set({
        status: "sending",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(campaigns.id, campaign.id), eq(campaigns.status, "scheduled")),
      )
      .returning({ id: campaigns.id });

    if (!claimedCampaign) {
      continue;
    }

    try {
      await triggerCampaignSendBackground(campaign.id);
    } catch (error) {
      await db
        .update(campaigns)
        .set({
          status: "scheduled",
          startedAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, campaign.id), eq(campaigns.status, "sending")));

      throw error;
    }
  }

  return Response.json({
    dispatched: dueCampaigns.length,
  });
};

export const config: Config = {
  schedule: "* * * * *",
};
