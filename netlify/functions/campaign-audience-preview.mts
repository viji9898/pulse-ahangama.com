import type { Config } from "@netlify/functions";
import {
  findCampaignAudience,
  type CampaignAudienceDefinition,
} from "./_shared/campaign-audience.js";

type RequestBody = {
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
        error: "Invalid JSON request body",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const recipients = await findCampaignAudience(input.audience ?? {});

    const estimatedCostPerMessageUsd = Math.max(
      0,
      input.estimatedCostPerMessageUsd ?? 0.02,
    );

    const estimatedMetaCostUsd = recipients.length * estimatedCostPerMessageUsd;

    const venuePriceUsd = Math.max(0, input.venuePriceUsd ?? 0);

    return Response.json({
      recipientCount: recipients.length,
      estimatedCostPerMessageUsd,
      estimatedMetaCostUsd: Math.round(estimatedMetaCostUsd * 100) / 100,
      venuePriceUsd,
      estimatedGrossProfitUsd:
        Math.round((venuePriceUsd - estimatedMetaCostUsd) * 100) / 100,
      estimatedMarginPercent:
        venuePriceUsd > 0
          ? Math.round(
              ((venuePriceUsd - estimatedMetaCostUsd) / venuePriceUsd) * 10000,
            ) / 100
          : null,
      recipients: recipients.slice(0, 50),
      previewTruncated: recipients.length > 50,
    });
  } catch (error) {
    console.error("Campaign audience preview failed", error);

    return Response.json(
      {
        error: "Unable to preview campaign audience",
      },
      {
        status: 500,
      },
    );
  }
};

export const config: Config = {
  path: "/api/campaigns/audience-preview",
};
