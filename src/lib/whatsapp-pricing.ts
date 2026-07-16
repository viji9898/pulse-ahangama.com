export const WHATSAPP_PRICING = {
  marketing: {
    LK: 0.0732,
    GB: 0.0635,
    EG: 0.0644,
    IN: 0.0118,
  },
  utility: {
    LK: 0,
    GB: 0,
    EG: 0,
    IN: 0,
  },
} as const;

export const WHATSAPP_MARKETING_PRICING: Record<string, number> =
  WHATSAPP_PRICING.marketing;

export const DEFAULT_MARKETING_PRICE = WHATSAPP_PRICING.marketing.LK;

export type WhatsAppPricingCategory = keyof typeof WHATSAPP_PRICING;

export type WhatsAppCostBreakdown = Record<
  string,
  {
    count: number;
    price: number;
    total: number;
  }
>;

function normalizeCountryCode(countryCode?: string | null): string {
  return countryCode?.trim().toUpperCase() || "LK";
}

function roundCurrency(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function getMessageCost(
  category: WhatsAppPricingCategory,
  countryCode?: string | null,
): number {
  const pricing = WHATSAPP_PRICING[category] as Record<string, number>;

  return pricing[normalizeCountryCode(countryCode)] ?? DEFAULT_MARKETING_PRICE;
}

export function getMarketingMessageCost(countryCode?: string | null): number {
  return getMessageCost("marketing", countryCode);
}

export function calculateMarketingCostBreakdown(
  recipients: Array<{ countryCode?: string | null }>,
): {
  costBreakdown: WhatsAppCostBreakdown;
  estimatedMetaCostUsd: number;
} {
  const costBreakdown: WhatsAppCostBreakdown = {};

  for (const recipient of recipients) {
    const countryCode = normalizeCountryCode(recipient.countryCode);
    const price = getMarketingMessageCost(countryCode);
    const current = costBreakdown[countryCode] ?? {
      count: 0,
      price,
      total: 0,
    };

    current.count += 1;
    current.total = roundCurrency(current.total + price);
    costBreakdown[countryCode] = current;
  }

  return {
    costBreakdown,
    estimatedMetaCostUsd: roundCurrency(
      Object.values(costBreakdown).reduce((sum, item) => sum + item.total, 0),
    ),
  };
}