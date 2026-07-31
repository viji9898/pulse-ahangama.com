import { env } from "./env.js";

const TEMPLATE_FETCH_RETRY_DELAYS_MS = [250, 750] as const;

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{
    type: string;
    format?: string;
    example?: {
      header_handle?: string[];
    };
  }>;
};

type MetaTemplateResponse = {
  data?: MetaTemplate[];
  error?: {
    message?: string;
  };
};

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function shouldRetryTemplateRequest(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return true;
    }

    if (/HTTP 429|HTTP 5\d\d|fetch failed/i.test(error.message)) {
      return true;
    }
  }

  return false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function getTemplate(
  name: string,
  language: string,
): Promise<MetaTemplate | null> {
  const url = new URL(
    `https://graph.facebook.com/${env.metaGraphApiVersion}/${env.whatsappWabaId}/message_templates`,
  );

  url.searchParams.set("name", name);
  url.searchParams.set("fields", "id,name,language,status,category,components");

  let result: MetaTemplateResponse | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= TEMPLATE_FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.whatsappAccessToken}`,
        },
        signal: AbortSignal.timeout(10_000),
      });

      const responseText = await response.text();

      result = responseText
        ? (JSON.parse(responseText) as MetaTemplateResponse)
        : {};

      if (!response.ok) {
        throw new Error(
          result.error?.message || `Unable to load Meta template (HTTP ${response.status})`,
        );
      }

      break;
    } catch (error) {
      lastError = error;

      if (
        attempt === TEMPLATE_FETCH_RETRY_DELAYS_MS.length ||
        !shouldRetryTemplateRequest(error)
      ) {
        throw new Error(
          `Unable to load Meta template ${name}/${language}: ${getErrorMessage(error)}`,
        );
      }

      await wait(TEMPLATE_FETCH_RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!result) {
    throw new Error(
      `Unable to load Meta template ${name}/${language}: ${getErrorMessage(lastError)}`,
    );
  }

  return (
    result.data?.find(
      (template) => template.name === name && template.language === language,
    ) ?? null
  );
}

export function getTemplateHeaderExampleImageUrl(
  template: MetaTemplate,
): string | undefined {
  return template.components?.find(
    (component) => component.type === "HEADER" && component.format === "IMAGE",
  )?.example?.header_handle?.[0];
}
