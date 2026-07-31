import type { Config } from "@netlify/functions";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  campaignRecipients,
  campaigns,
  conversations,
  messages,
} from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import {
  getTemplate,
  getTemplateHeaderExampleImageUrl,
} from "./_shared/meta-templates.js";
import { triggerCampaignSendBackground } from "./_shared/internal-api.js";
import {
  buildCampaignTemplate,
  getFeatureArticleButtonUrl,
  getTemplateHeaderImageUrl,
} from "./_shared/campaign-template-builder.js";
import { renderTemplateMessage } from "./_shared/render-template-message.js";
import { resolveGuestConversation } from "./_shared/resolve-guest-conversation.js";
import { sendNamedTemplateMessage } from "./_shared/whatsapp-client.js";

type RequestBody = {
  campaignId?: string;
};

const BATCH_SIZE = 50;
const SEND_CONCURRENCY = 5;

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  if (request.headers.get("authorization") !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const input = (await request.json()) as RequestBody;

  if (!input.campaignId) {
    return Response.json({ error: "campaignId is required" }, { status: 400 });
  }

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, input.campaignId))
    .limit(1);

  if (!campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.templateName || !campaign.templateLanguage) {
    return Response.json(
      { error: "Campaign has no template configuration" },
      { status: 400 },
    );
  }

  const template = await getTemplate(
    campaign.templateName,
    campaign.templateLanguage,
  );

  if (!template || template.status !== "APPROVED") {
    return Response.json(
      { error: "Template must be approved before sending" },
      { status: 409 },
    );
  }

  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaign.id),
        inArray(campaignRecipients.status, ["pending", "queued"]),
      ),
    )
    .orderBy(asc(campaignRecipients.createdAt))
    .limit(BATCH_SIZE);

  if (!recipients.length) {
    const statuses = await db
      .select({ status: campaignRecipients.status })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, campaign.id));

    const sentCount = statuses.filter((item) =>
      ["sent", "delivered", "read"].includes(item.status),
    ).length;
    const failedCount = statuses.filter((item) => item.status === "failed").length;

    await db
      .update(campaigns)
      .set({
        status: failedCount === statuses.length && statuses.length > 0 ? "cancelled" : "completed",
        sentCount,
        failedCount,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));

    return Response.json({ ok: true, dispatched: 0, remaining: 0 });
  }

  const approvedTemplate = template;
  const templateName = campaign.templateName;
  const templateLanguage = campaign.templateLanguage;

  async function sendRecipient(recipient: typeof recipients[number]) {
    const variables = recipient.templateVariables ?? {};
    const buttonUrl =
      campaign.contentPayload.type === "feature_article"
        ? getFeatureArticleButtonUrl(campaign.contentPayload.articleUrl)
        : undefined;
    const renderedBody = renderTemplateMessage({
      templateName,
      variables,
      buttonUrl,
    });
    const headerImageUrl =
      getTemplateHeaderImageUrl(templateName) ??
      getTemplateHeaderExampleImageUrl(approvedTemplate);
    const buttonUrlSuffix =
      templateName === "qs_feature_article_ahangama_pass"
        ? undefined
        : buildCampaignTemplate(campaign.contentPayload).buttonUrlSuffix;

    const { conversation } = await resolveGuestConversation(recipient.guestId);

    const [existingQueuedMessage] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.campaignId, campaign.id),
          eq(messages.guestId, recipient.guestId),
          eq(messages.status, "queued"),
        ),
      )
      .orderBy(asc(messages.createdAt))
      .limit(1);

    const pendingMessage =
      existingQueuedMessage ??
      (
        await db
          .insert(messages)
          .values({
            conversationId: conversation.id,
            guestId: recipient.guestId,
            campaignId: campaign.id,
            channel: "whatsapp",
            direction: "outbound",
            status: "queued",
            messageType: "template",
            body: renderedBody,
            providerPayload: {
              templateName,
              languageCode: templateLanguage,
              senderKey: campaign.whatsappSenderKey,
              headerImageUrl,
              buttonUrlSuffix,
              variables,
            },
          })
          .returning()
      )[0];

    try {
      const result = await sendNamedTemplateMessage({
        to: recipient.phoneNumber,
        templateName,
        languageCode: templateLanguage,
        variables,
        headerImageUrl,
        buttonUrlSuffix,
        senderKey: campaign.whatsappSenderKey,
      });

      const providerMessageId = result.messages?.[0]?.id;

      if (!providerMessageId) {
        throw new Error("Meta did not return a message ID");
      }

      const sentAt = new Date();

      await db
        .update(messages)
        .set({
          providerMessageId,
          status: "sent",
          sentAt,
          providerPayload: {
            templateName,
            languageCode: templateLanguage,
            senderKey: campaign.whatsappSenderKey,
            headerImageUrl,
            buttonUrlSuffix,
            variables,
            metaResponse: result,
          },
        })
        .where(eq(messages.id, pendingMessage.id));

      await db
        .update(campaignRecipients)
        .set({
          status: "sent",
          providerMessageId,
          sentAt,
          errorCode: null,
          errorMessage: null,
        })
        .where(eq(campaignRecipients.id, recipient.id));

      await db
        .update(conversations)
        .set({
          lastMessagePreview: renderedBody.slice(0, 250),
          lastMessageAt: sentAt,
          updatedAt: sentAt,
        })
        .where(eq(conversations.id, conversation.id));
    } catch (error) {
      const failedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db
        .update(messages)
        .set({
          status: "failed",
          failedAt,
          providerPayload: {
            error: errorMessage,
            templateName,
            headerImageUrl,
            buttonUrlSuffix,
            variables,
          },
        })
        .where(eq(messages.id, pendingMessage.id));

      await db
        .update(campaignRecipients)
        .set({
          status: "failed",
          failedAt,
          errorMessage,
        })
        .where(eq(campaignRecipients.id, recipient.id));
    }
  }

  for (let index = 0; index < recipients.length; index += SEND_CONCURRENCY) {
    await Promise.all(
      recipients.slice(index, index + SEND_CONCURRENCY).map(sendRecipient),
    );
  }

  const remaining = await db
    .select({ id: campaignRecipients.id })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaign.id),
        inArray(campaignRecipients.status, ["pending", "queued"]),
      ),
    )
    .limit(1);

  const statuses = await db
    .select({ status: campaignRecipients.status })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaign.id));

  const sentCount = statuses.filter((item) =>
    ["sent", "delivered", "read"].includes(item.status),
  ).length;
  const failedCount = statuses.filter((item) => item.status === "failed").length;

  await db
    .update(campaigns)
    .set({
      status: remaining.length ? "sending" : "completed",
      sentCount,
      failedCount,
      startedAt: campaign.startedAt ?? new Date(),
      completedAt: remaining.length ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaign.id));

  if (remaining.length) {
    await triggerCampaignSendBackground(campaign.id);
  }

  return Response.json({ ok: true, dispatched: recipients.length, remaining: remaining.length });
};

export const config: Config = {
  path: "/api/campaigns/send-background",
};