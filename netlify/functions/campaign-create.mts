import type { Config } from "@netlify/functions";
import { campaignRecipients, campaigns } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  findCampaignAudience,
  type CampaignAudienceDefinition,
} from "./_shared/campaign-audience.js";
import type { CampaignContent } from "./_shared/campaign-content-types.js";
import { buildCampaignTemplate } from "./_shared/campaign-template-builder.js";
import { campaignContentSchema } from "./_shared/campaign-validation.js";

type RequestBody = {
  name?: string;
  venueId?: string | null;
  scheduledAt?: string | null;
  audience?: CampaignAudienceDefinition;
  estimatedCostPerMessageUsd?: number;
  venuePriceUsd?: number;
  content?: CampaignContent;
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

  const parsedContent = campaignContentSchema.safeParse(input.content);

  if (!parsedContent.success) {
    return Response.json(
      {
        error: "Valid campaign content is required",
        issues: parsedContent.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  const content = parsedContent.data as CampaignContent;
  const builtTemplate = buildCampaignTemplate(content);

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
        campaignType: content.type,
        venueId: input.venueId || null,
        templateName: builtTemplate.templateName,
        templateLanguage: builtTemplate.languageCode,
        contentPayload: content,
        templateVariables: builtTemplate.variables,
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
            ...builtTemplate.variables,
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
