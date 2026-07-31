import type { Config } from "@netlify/functions";
import { env } from "./_shared/env.js";

type MetaDebugTokenResponse = {
  data?: {
    app_id?: string;
    type?: string;
    application?: string;
    data_access_expires_at?: number;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
  };
};

export default async (): Promise<Response> => {
  const url = new URL(`https://graph.facebook.com/${env.metaGraphApiVersion}/debug_token`);
  url.searchParams.set("input_token", env.whatsappAccessToken);
  url.searchParams.set("access_token", env.whatsappAccessToken);

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    const payload = (await response.json()) as MetaDebugTokenResponse;

    if (!response.ok || !payload.data) {
      return Response.json(
        {
          ok: false,
          error: "Unable to load WhatsApp token status",
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      token: {
        appId: payload.data.app_id ?? null,
        type: payload.data.type ?? null,
        application: payload.data.application ?? null,
        isValid: payload.data.is_valid ?? false,
        expiresAt:
          payload.data.expires_at != null
            ? new Date(payload.data.expires_at * 1000).toISOString()
            : null,
        dataAccessExpiresAt:
          payload.data.data_access_expires_at != null
            ? new Date(payload.data.data_access_expires_at * 1000).toISOString()
            : null,
        scopes: payload.data.scopes ?? [],
      },
    });
  } catch (error) {
    console.error("WhatsApp token status check failed", error);

    return Response.json(
      {
        ok: false,
        error: "Unable to load WhatsApp token status",
      },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/whatsapp-token-status",
};