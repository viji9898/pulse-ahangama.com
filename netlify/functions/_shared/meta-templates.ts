import { env } from "./env.js";

type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
};

type MetaTemplateResponse = {
  data?: MetaTemplate[];
  error?: {
    message?: string;
  };
};

export async function getTemplate(
  name: string,
  language: string,
): Promise<MetaTemplate | null> {
  const url = new URL(
    `https://graph.facebook.com/${env.metaGraphApiVersion}/${env.whatsappWabaId}/message_templates`,
  );

  url.searchParams.set("name", name);
  url.searchParams.set("fields", "id,name,language,status,category");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
    },
  });

  const result = (await response.json()) as MetaTemplateResponse;

  if (!response.ok) {
    throw new Error(result.error?.message || "Unable to load Meta template");
  }

  return (
    result.data?.find(
      (template) => template.name === name && template.language === language,
    ) ?? null
  );
}
