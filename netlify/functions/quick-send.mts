import type { Config } from "@netlify/functions";
import { campaigns } from "../../db/schema/index.js";
import { buildCampaignTemplate } from "./_shared/campaign-template-builder.js";
import { campaignContentSchema } from "./_shared/campaign-validation.js";
import { db } from "./_shared/db.js";
import type { WhatsAppSenderKey } from "./_shared/whatsapp-client.js";
import sendCampaignTest from "./campaign-send-test.mjs";

const whatsappSenderKeys = ["ahangama", "ahangama_pass"] as const;

type RequestBody = {
  name?: string;
  audienceId?: string;
  whatsappSenderKey?: WhatsAppSenderKey;
  content?: unknown;
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

  const parsedContent = campaignContentSchema.safeParse(input.content);

  if (!parsedContent.success || parsedContent.data.type !== "feature_article") {
    return Response.json(
      { error: "Valid Feature Article content is required" },
      { status: 400 },
    );
  }

  if (!input.audienceId) {
    return Response.json(
      { error: "A test audience is required" },
      { status: 400 },
    );
  }

  const whatsappSenderKey = input.whatsappSenderKey ?? "ahangama";

  if (!whatsappSenderKeys.includes(whatsappSenderKey)) {
    return Response.json(
      { error: "Valid WhatsApp sender is required" },
      { status: 400 },
    );
  }

  const content = parsedContent.data;
  const builtTemplate = buildCampaignTemplate(content);
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: input.name?.trim() || `Quick Send: ${content.articleTitle}`,
      channel: "whatsapp",
      status: "draft",
      kind: "quick_send",
      campaignType: content.type,
      whatsappSenderKey,
      templateName: builtTemplate.templateName,
      templateLanguage: builtTemplate.languageCode,
      contentPayload: content,
      templateVariables: builtTemplate.variables,
      audienceDefinition: {},
      recipientCount: 0,
      estimatedMetaCostUsd: "0",
      venuePriceUsd: "0",
    })
    .returning({ id: campaigns.id });

  const sendResponse = await sendCampaignTest(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        audienceId: input.audienceId,
      }),
    }),
  );
  const sendResult = (await sendResponse.json()) as Record<string, unknown>;

  return Response.json(
    {
      ...sendResult,
      campaignId: campaign.id,
    },
    { status: sendResponse.status },
  );
};

export const config: Config = {
  path: "/api/quick-send",
};