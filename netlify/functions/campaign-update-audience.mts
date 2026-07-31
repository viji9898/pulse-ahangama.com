import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { campaignRecipients, campaigns } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  findCampaignAudience,
  type CampaignAudienceDefinition,
} from "./_shared/campaign-audience.js";
import { getMarketingMessageCost } from "../../src/lib/whatsapp-pricing.js";
import { calculateMarketingCostBreakdown } from "../../src/lib/whatsapp-pricing.js";

type RequestBody = {
  campaignId?: string;
  audience?: CampaignAudienceDefinition;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let input: RequestBody;

  try {
    input = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.campaignId) {
    return Response.json({ error: "campaignId is required" }, { status: 400 });
  }

  const audience = input.audience ?? {};

  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, input.campaignId))
      .limit(1);

    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (["sending", "completed", "cancelled"].includes(campaign.status)) {
      return Response.json(
        {
          error: "Only draft or scheduled campaigns can update their audience.",
        },
        { status: 409 },
      );
    }

    const recipients = await findCampaignAudience(audience);
    const { costBreakdown, estimatedMetaCostUsd } =
      calculateMarketingCostBreakdown(recipients);

    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaign.id));

    if (recipients.length) {
      await db.insert(campaignRecipients).values(
        recipients.map((recipient) => ({
          campaignId: campaign.id,
          guestId: recipient.id,
          phoneNumber: recipient.normalizedPhoneNumber!,
          status: "pending" as const,
          estimatedCostUsd: getMarketingMessageCost(
            recipient.countryCode,
          ).toFixed(4),
          templateVariables: {
            ...(campaign.templateVariables ?? {}),
            ...(Object.prototype.hasOwnProperty.call(
              campaign.templateVariables ?? {},
              "customer_name",
            )
              ? { customer_name: recipient.firstName || "there" }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(
              campaign.templateVariables ?? {},
              "first_name",
            )
              ? { first_name: recipient.firstName || "there" }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(
              campaign.templateVariables ?? {},
              "contact_name",
            )
              ? { contact_name: recipient.firstName || "there" }
              : {}),
            audience_sources: recipient.sources
              .map((source) => source.audienceName)
              .join(", "),
          },
        })),
      );
    }

    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        audienceDefinition: audience,
        recipientCount: recipients.length,
        estimatedMetaCostUsd: estimatedMetaCostUsd.toFixed(4),
        sentCount: 0,
        failedCount: 0,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, campaign.id), eq(campaigns.kind, "campaign")))
      .returning();

    return Response.json({
      ok: true,
      campaign: updatedCampaign,
      recipientCount: recipients.length,
      costBreakdown,
      estimatedMetaCostUsd,
    });
  } catch (error) {
    console.error("Campaign audience update failed", error);

    return Response.json({ error: "Unable to update campaign audience" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/campaigns/update-audience",
};