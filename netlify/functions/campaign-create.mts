import type { Config } from "@netlify/functions";
import { campaignRecipients, campaigns } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  findCampaignAudience,
  type CampaignAudienceDefinition,
} from "./_shared/campaign-audience.js";

type RequestBody = {
  name?: string;
  venueId?: string | null;
  templateName?: string;
  templateLanguage?: string;
  scheduledAt?: string | null;
  audience?: CampaignAudienceDefinition;
  estimatedCostPerMessageUsd?: number;
  venuePriceUsd?: number;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "POST",
      },
    });
  }

  let input: RequestBody;

  try {
    input = (await request.json()) as RequestBody;
  } catch {
    return Response.json(
      {
        error: "Invalid JSON body",
      },
      {
        status: 400,
      },
    );
  }

  const name = input.name?.trim();
  const templateName = input.templateName?.trim();

  if (!name) {
    return Response.json(
      {
        error: "Campaign name is required",
      },
      {
        status: 400,
      },
    );
  }

  if (!templateName) {
    return Response.json(
      {
        error: "WhatsApp template is required",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const audience = input.audience ?? {
      whatsappOptIn: true,
    };

    const recipients = await findCampaignAudience(audience);

    const estimatedCostPerMessageUsd = Math.max(
      0,
      input.estimatedCostPerMessageUsd ?? 0.02,
    );

    const estimatedMetaCostUsd = recipients.length * estimatedCostPerMessageUsd;

    const venuePriceUsd = Math.max(0, input.venuePriceUsd ?? 0);

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return Response.json(
        {
          error: "scheduledAt is invalid",
        },
        {
          status: 400,
        },
      );
    }

    const [campaign] = await db
      .insert(campaigns)
      .values({
        name,
        channel: "whatsapp",
        status: scheduledAt ? "scheduled" : "draft",
        venueId: input.venueId || null,
        templateName,
        templateLanguage: input.templateLanguage ?? "en_US",
        audienceDefinition: audience,
        recipientCount: recipients.length,
        estimatedMetaCostUsd: estimatedMetaCostUsd.toFixed(2),
        venuePriceUsd: venuePriceUsd.toFixed(2),
        scheduledAt,
      })
      .returning();

    if (recipients.length) {
      await db.insert(campaignRecipients).values(
        recipients.map((recipient) => ({
          campaignId: campaign.id,
          guestId: recipient.id,
          phoneNumber: recipient.normalizedPhoneNumber!,
          status: "pending" as const,
          estimatedCostUsd: estimatedCostPerMessageUsd.toFixed(4),
          templateVariables: {
            first_name: recipient.firstName || "there",
          },
        })),
      );
    }

    return Response.json(
      {
        ok: true,
        campaign,
        recipientCount: recipients.length,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Campaign creation failed", error);

    return Response.json(
      {
        error: "Unable to create campaign",
      },
      {
        status: 500,
      },
    );
  }
};

export const config: Config = {
  path: "/api/campaigns/create",
};
