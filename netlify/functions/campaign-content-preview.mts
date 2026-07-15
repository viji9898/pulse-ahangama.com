import type { Config } from "@netlify/functions";
import type { CampaignContent } from "./_shared/campaign-content-types.js";
import { buildCampaignTemplate } from "./_shared/campaign-template-builder.js";
import { campaignContentSchema } from "./_shared/campaign-validation.js";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = campaignContentSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid campaign content",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const content = parsed.data as CampaignContent;
    const built = buildCampaignTemplate(content);

    return Response.json({
      ok: true,
      campaignType: content.type,
      content,
      templateName: built.templateName,
      languageCode: built.languageCode,
      variables: built.variables,
      preview: built.preview,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to build preview",
      },
      { status: 400 },
    );
  }
};

export const config: Config = {
  path: "/api/campaigns/content-preview",
};
