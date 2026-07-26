import { env } from "./env.js";

export type WhatsAppSenderKey = "ahangama" | "ahangama_pass";

type WhatsAppSenderInput = {
  senderKey?: WhatsAppSenderKey | null;
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

export function getWhatsAppPhoneNumberId(
  senderKey: WhatsAppSenderKey = "ahangama",
): string {
  if (senderKey === "ahangama_pass") {
    return env.whatsappPhoneNumberIdAhangamaPass;
  }

  return env.whatsappPhoneNumberId;
}

export function getWhatsAppSenderKey(
  phoneNumberId?: string | null,
): WhatsAppSenderKey | null {
  if (phoneNumberId === env.whatsappPhoneNumberId) {
    return "ahangama";
  }

  if (phoneNumberId === env.whatsappPhoneNumberIdAhangamaPass) {
    return "ahangama_pass";
  }

  return null;
}

async function sendMessage(
  payload: Record<string, unknown>,
  senderKey?: WhatsAppSenderKey | null,
): Promise<MetaMessageResponse> {
  const endpoint =
    `https://graph.facebook.com/` +
    `${env.metaGraphApiVersion}/` +
    `${getWhatsAppPhoneNumberId(senderKey ?? "ahangama")}/messages`;

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
} & WhatsAppSenderInput): Promise<MetaMessageResponse> {
  return sendMessage(
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(input.to),
      type: "text",
      text: {
        preview_url: false,
        body: input.body,
      },
    },
    input.senderKey,
  );
}

export async function sendTemplateMessage(input: {
  to: string;
  templateName?: string;
  languageCode?: string;
} & WhatsAppSenderInput): Promise<MetaMessageResponse> {
  return sendMessage(
    {
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
    },
    input.senderKey,
  );
}

export async function sendNamedTemplateMessage(input: {
  to: string;
  templateName: string;
  languageCode: string;
  variables: Record<string, string>;
  headerImageUrl?: string;
} & WhatsAppSenderInput): Promise<MetaMessageResponse> {
  const components = [
    ...(input.headerImageUrl
      ? [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: input.headerImageUrl,
                },
              },
            ],
          },
        ]
      : []),
    {
      type: "body",
      parameters: Object.entries(input.variables).map(([name, value]) => ({
        type: "text",
        parameter_name: name,
        text: value,
      })),
    },
  ];

  return sendMessage(
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(input.to),
      type: "template",
      template: {
        name: input.templateName,
        language: {
          code: input.languageCode,
        },
        components,
      },
    },
    input.senderKey,
  );
}
