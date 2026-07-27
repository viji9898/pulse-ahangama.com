import type { CampaignContent } from "./campaign-content-types.js";
import {
  buildCampaignTemplate,
  type BuiltCampaignTemplate,
} from "./campaign-template-builder.js";
import type { WhatsAppSenderKey } from "./whatsapp-client.js";

export const quickSendTemplateNames = [
  "feature_article",
  "qs_feature_article_ahangama_pass",
] as const;

export type QuickSendTemplateName = (typeof quickSendTemplateNames)[number];

export const AHANGAMA_PASS_FEATURE_ARTICLE_CONTENT = {
  type: "feature_article",
  articleTitle: "Inside Ahangama Circle",
  description:
    "A community bringing together founders, creatives, hospitality leaders and local businesses shaping the future of Sri Lanka's south coast.",
  articleUrl: "https://ahangama.com/inside-the-launch-of-ahangama-circle/",
} satisfies CampaignContent;

export function getQuickSendSenderKey(
  requestedSenderKey?: WhatsAppSenderKey,
): WhatsAppSenderKey {
  return requestedSenderKey ?? "ahangama";
}

export function buildQuickSendTemplate(
  templateName: QuickSendTemplateName,
  content: CampaignContent,
): BuiltCampaignTemplate {
  if (templateName === "feature_article") {
    return buildCampaignTemplate(content);
  }

  return {
    templateName,
    languageCode: "en",
    variables: {
      contact_name: "there",
    },
    preview: [
      "Hi there 👋🏾",
      "",
      "Inside Ahangama Circle",
      "",
      "A community bringing together founders, creatives, hospitality leaders and local businesses shaping the future of Sri Lanka's south coast.",
      "",
      "Inside the story, discover how Ahangama Circle began, meet the people behind it, and see what's planned next.",
      "",
      "Read the full story below.",
      "",
      "Read Story: https://ahangama.com/inside-the-launch-of-ahangama-circle/",
      "I'd love to attend the next event.",
    ].join("\n"),
  };
}