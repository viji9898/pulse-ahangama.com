import { env } from "./env.js";

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

type NamedTemplateVariable = {
  name: string;
  value: string;
};

function normalizePhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.replace(/[^\d]/g, "");

  if (!normalized) {
    throw new Error("Recipient phone number is invalid");
  }

  return normalized;
}

async function sendMessage(
  payload: Record<string, unknown>,
): Promise<MetaMessageResponse> {
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
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as MetaMessageResponse;

  if (!response.ok) {
    console.error("Meta message request failed", result);

    throw new Error(
      result.error?.message ?? `Meta returned HTTP ${response.status}`,
    );
  }

  return result;
}

export async function sendTextMessage(input: {
  to: string;
  body: string;
}): Promise<MetaMessageResponse> {
  return sendMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhoneNumber(input.to),
    type: "text",
    text: {
      preview_url: false,
      body: input.body,
    },
  });
}

export async function sendTemplateMessage(input: {
  to: string;
  templateName?: string;
  languageCode?: string;
}): Promise<MetaMessageResponse> {
  return sendMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhoneNumber(input.to),
    type: "template",
    template: {
      name: input.templateName ?? "hello_world",
      language: {
        code: input.languageCode ?? "en_US",
      },
    },
  });
}

export async function sendNamedTemplateMessage(input: {
  to: string;
  templateName: string;
  languageCode: string;
  variables: NamedTemplateVariable[];
}): Promise<MetaMessageResponse> {
  return sendMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhoneNumber(input.to),
    type: "template",
    template: {
      name: input.templateName,
      language: {
        code: input.languageCode,
      },
      components: [
        {
          type: "body",
          parameters: input.variables.map((variable) => ({
            type: "text",
            parameter_name: variable.name,
            text: variable.value,
          })),
        },
      ],
    },
  });
}
