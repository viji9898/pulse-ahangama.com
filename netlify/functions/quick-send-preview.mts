import type { Config } from "@netlify/functions";
import { campaignContentSchema } from "./_shared/campaign-validation.js";
import {
  AHANGAMA_PASS_FEATURE_ARTICLE_CONTENT,
  buildQuickSendTemplate,
  getQuickSendSenderKey,
  quickSendTemplateNames,
  type QuickSendTemplateName,
} from "./_shared/quick-send-template.js";
import type { WhatsAppSenderKey } from "./_shared/whatsapp-client.js";

type RequestBody = {
  templateName?: QuickSendTemplateName;
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

  const templateName = quickSendTemplateNames.find(
    (name) => name === input.templateName,
  );

  if (!templateName) {
    return Response.json(
      { error: "Valid Quick Send template is required" },
      { status: 400 },
    );
  }

  const parsedContent = campaignContentSchema.safeParse(
    templateName === "qs_feature_article_ahangama_pass"
      ? AHANGAMA_PASS_FEATURE_ARTICLE_CONTENT
      : input.content,
  );

  if (!parsedContent.success || parsedContent.data.type !== "feature_article") {
    return Response.json(
      { error: "Valid Feature Article content is required" },
      { status: 400 },
    );
  }

  const built = buildQuickSendTemplate(templateName, parsedContent.data);

  return Response.json({
    ok: true,
    templateName: built.templateName,
    languageCode: built.languageCode,
    senderKey: getQuickSendSenderKey(input.whatsappSenderKey),
    preview: built.preview,
  });
};

export const config: Config = {
  path: "/api/quick-send/preview",
};