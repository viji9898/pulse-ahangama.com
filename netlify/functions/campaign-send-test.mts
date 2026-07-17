import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import {
  campaigns,
  campaignTestRecipients,
  campaignTestRuns,
  conversations,
  guests,
  messages,
  testAudienceMembers,
  testAudiences,
} from "../../db/schema/index.js";
import { db } from "./_shared/db.js";
import { getTemplate } from "./_shared/meta-templates.js";
import { getTemplateHeaderImageUrl } from "./_shared/campaign-template-builder.js";
import { renderTemplateMessage } from "./_shared/render-template-message.js";
import { resolveGuestConversation } from "./_shared/resolve-guest-conversation.js";
import { sendNamedTemplateMessage } from "./_shared/whatsapp-client.js";

type RequestBody = {
  campaignId?: string;
  audienceId?: string;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const input = (await request.json()) as RequestBody;

  if (!input.campaignId || !input.audienceId) {
    return Response.json(
      { error: "campaignId and audienceId are required" },
      { status: 400 },
    );
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

  if (!template) {
    return Response.json(
      { error: "Template was not found in Meta" },
      { status: 409 },
    );
  }

  if (template.status !== "APPROVED") {
    return Response.json(
      {
        error: `Template is ${template.status}. It must be APPROVED before sending.`,
        template,
      },
      { status: 409 },
    );
  }

  const members = await db
    .select({
      guestId: guests.id,
      firstName: guests.firstName,
      phoneNumber: guests.normalizedPhoneNumber,
      whatsappOptIn: guests.whatsappOptIn,
    })
    .from(testAudienceMembers)
    .innerJoin(guests, eq(testAudienceMembers.guestId, guests.id))
    .innerJoin(
      testAudiences,
      eq(testAudienceMembers.audienceId, testAudiences.id),
    )
    .where(
      and(
        eq(testAudienceMembers.audienceId, input.audienceId),
        eq(testAudiences.active, true),
      ),
    );

  const eligibleMembers = members.filter(
    (member) => member.phoneNumber && member.whatsappOptIn,
  );

  const uniqueEligibleMembers = Array.from(
    new Map(
      eligibleMembers.map((member) => [member.phoneNumber, member]),
    ).values(),
  );

  if (!uniqueEligibleMembers.length) {
    return Response.json(
      { error: "The test audience has no eligible recipients" },
      { status: 409 },
    );
  }

  if (uniqueEligibleMembers.length > 20) {
    return Response.json(
      { error: "Test sends are limited to 20 recipients" },
      { status: 400 },
    );
  }

  const [testRun] = await db
    .insert(campaignTestRuns)
    .values({
      campaignId: campaign.id,
      audienceId: input.audienceId,
      status: "sending",
      recipientCount: uniqueEligibleMembers.length,
      startedAt: new Date(),
    })
    .returning();

  await db.insert(campaignTestRecipients).values(
    uniqueEligibleMembers.map((member) => ({
      testRunId: testRun.id,
      guestId: member.guestId,
      phoneNumber: member.phoneNumber!,
      status: "pending" as const,
    })),
  );

  let sentCount = 0;
  let failedCount = 0;

  for (const member of uniqueEligibleMembers) {
    const baseVariables = campaign.templateVariables ?? {};
    const guestName = member.firstName || "there";
    const variables = {
      ...baseVariables,
      ...(Object.prototype.hasOwnProperty.call(baseVariables, "customer_name")
        ? { customer_name: guestName }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(baseVariables, "first_name")
        ? { first_name: guestName }
        : {}),
    };

    const { conversation } = await resolveGuestConversation(member.guestId);
    const renderedBody = renderTemplateMessage({
      templateName: campaign.templateName,
      variables,
    });
    const headerImageUrl = getTemplateHeaderImageUrl(campaign.templateName);

    const [pendingMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        guestId: member.guestId,
        campaignId: campaign.id,
        channel: "whatsapp",
        direction: "outbound",
        status: "queued",
        messageType: "template",
        body: renderedBody,
        providerPayload: {
          templateName: campaign.templateName,
          languageCode: campaign.templateLanguage,
          headerImageUrl,
          variables,
          testRunId: testRun.id,
        },
      })
      .returning();

    try {
      const result = await sendNamedTemplateMessage({
        to: member.phoneNumber!,
        templateName: campaign.templateName,
        languageCode: campaign.templateLanguage,
        variables,
        headerImageUrl,
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
            templateName: campaign.templateName,
            languageCode: campaign.templateLanguage,
            headerImageUrl,
            variables,
            metaResponse: result,
            testRunId: testRun.id,
          },
        })
        .where(eq(messages.id, pendingMessage.id));

      await db
        .update(campaignTestRecipients)
        .set({
          status: "sent",
          providerMessageId,
          sentAt,
        })
        .where(
          and(
            eq(campaignTestRecipients.testRunId, testRun.id),
            eq(campaignTestRecipients.guestId, member.guestId),
          ),
        );

      await db
        .update(conversations)
        .set({
          lastMessagePreview: renderedBody.slice(0, 250),
          lastMessageAt: sentAt,
          updatedAt: sentAt,
        })
        .where(eq(conversations.id, conversation.id));

      sentCount += 1;
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
            templateName: campaign.templateName,
            headerImageUrl,
            variables,
            testRunId: testRun.id,
          },
        })
        .where(eq(messages.id, pendingMessage.id));

      await db
        .update(campaignTestRecipients)
        .set({
          status: "failed",
          failedAt,
          errorMessage,
        })
        .where(
          and(
            eq(campaignTestRecipients.testRunId, testRun.id),
            eq(campaignTestRecipients.guestId, member.guestId),
          ),
        );

      failedCount += 1;
    }
  }

  await db
    .update(campaignTestRuns)
    .set({
      status:
        failedCount === uniqueEligibleMembers.length ? "failed" : "completed",
      sentCount,
      failedCount,
      completedAt: new Date(),
    })
    .where(eq(campaignTestRuns.id, testRun.id));

  await db
    .update(campaigns)
    .set({
      lastTestRunId: testRun.id,
      lastTestSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaign.id));

  return Response.json({
    ok: failedCount === 0,
    testRunId: testRun.id,
    recipientCount: uniqueEligibleMembers.length,
    sentCount,
    failedCount,
  });
};

export const config: Config = {
  path: "/api/campaigns/send-test",
};
