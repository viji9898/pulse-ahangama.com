import { env } from "./env.js";

type SendTemplateInput = {
  to: string;
  templateName?: string;
  languageCode?: string;
};

type MetaMessageResponse = {
  messaging_product?: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
    message_status?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function normalizePhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.replace(/[^\d]/g, "");

  if (!normalized) {
    throw new Error("Recipient phone number is invalid");
  }

  return normalized;
}

export async function sendTemplateMessage({
  to,
  templateName = "hello_world",
  languageCode = "en_US",
}: SendTemplateInput): Promise<MetaMessageResponse> {
  const endpoint =
    `https://graph.facebook.com/` +
    `${env.metaGraphApiVersion}/` +
    `${env.whatsappPhoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    }),
  });

  const result = (await response.json()) as MetaMessageResponse;

  if (!response.ok) {
    console.error("Meta send-message request failed", result);

    throw new Error(
      result.error?.message ?? `Meta returned HTTP ${response.status}`,
    );
  }

  return result;
}
