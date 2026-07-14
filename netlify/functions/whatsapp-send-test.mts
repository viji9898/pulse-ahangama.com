import type { Config } from "@netlify/functions";
import { sendTemplateMessage } from "./_shared/whatsapp-client.js";

type RequestBody = {
  to?: string;
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

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (!body.to) {
    return Response.json(
      { error: 'The "to" phone number is required' },
      { status: 400 },
    );
  }

  try {
    const result = await sendTemplateMessage({
      to: body.to,
      templateName: "hello_world",
      languageCode: "en_US",
    });

    return Response.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("Test WhatsApp send failed", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown WhatsApp error",
      },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/whatsapp/test-send",
};