function getInternalApiSecret(): string {
  const value = process.env.INTERNAL_API_SECRET;

  if (!value) {
    throw new Error("INTERNAL_API_SECRET is not configured");
  }

  return value;
}

function getAppBaseUrl(): string {
  const value = process.env.URL ?? process.env.APP_URL;

  if (!value) {
    throw new Error("Neither URL nor APP_URL is configured");
  }

  return value.replace(/\/$/, "");
}

export async function triggerCampaignSendBackground(
  campaignId: string,
): Promise<void> {
  const response = await fetch(`${getAppBaseUrl()}/api/campaigns/send-background`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getInternalApiSecret()}`,
    },
    body: JSON.stringify({ campaignId }),
  });

  if (response.ok) {
    return;
  }

  const responseText = await response.text();
  const detail = responseText.trim();
  throw new Error(
    detail
      ? `Background send trigger failed (${response.status}): ${detail}`
      : `Background send trigger failed (${response.status})`,
  );
}