import type { CampaignContent } from "./campaign-content-types.js";

export type BuiltCampaignTemplate = {
  templateName: string;
  languageCode: string;
  variables: Record<string, string>;
  headerImageUrl?: string;
  preview: string;
};

export const FEATURED_CAFES_HEADER_IMAGE_URL =
  "https://customer-apps-techhq.s3.eu-west-2.amazonaws.com/app-ahangama-demo/featured_cafes_header.jpg";

export function getTemplateHeaderImageUrl(
  templateName: string,
): string | undefined {
  if (templateName === "featured_cafes") {
    return FEATURED_CAFES_HEADER_IMAGE_URL;
  }

  return undefined;
}

function cleanLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function formatEvent(event: {
  title: string;
  venue: string;
  time: string;
}): string {
  return [
    cleanLine(event.title),
    `📍 ${cleanLine(event.venue)}`,
    `🕒 ${cleanLine(event.time)}`,
  ].join(" · ");
}

export function buildCampaignTemplate(
  content: CampaignContent,
): BuiltCampaignTemplate {
  switch (content.type) {
    case "whats_on_today": {
      if (content.events.length !== 3) {
        throw new Error("What's On Today requires exactly three events");
      }

      const event1 = formatEvent(content.events[0]);
      const event2 = formatEvent(content.events[1]);
      const event3 = formatEvent(content.events[2]);

      return {
        templateName: "whats_on_today",
        languageCode: "en",
        variables: {
          customer_name: "there",
          event_1: event1,
          event_2: event2,
          event_3: event3,
        },
        preview: [
          "What's on in Ahangama Today?",
          "",
          "Hi there 👋",
          "",
          "Here’s what’s happening around Ahangama today:",
          "",
          event1,
          "",
          event2,
          "",
          event3,
          "",
          "Enjoy your day in Ahangama 🌴",
          "",
          "[Ahangama Events]",
          "[Our Wellness Picks]",
        ].join("\n"),
      };
    }

    case "featured_cafes":
      return {
        templateName: "featured_cafes",
        languageCode: "en",
        headerImageUrl: FEATURED_CAFES_HEADER_IMAGE_URL,
        variables: {
          first_name: "there",
        },
        preview: [
          "Best Cafés in Ahangama",
          "",
          "👋 Hey there!",
          "",
          "Our Favourite Cafes & Restaurants",
          "",
          "Kaffi Beachfront specialty coffee, excellent brunch and one of our favourite places to start the day.",
          "",
          "Veda Café Healthy breakfasts, Sri Lankan flavours and a calm space to slow down or catch up on work.",
          "",
          "Sisters Kabalana Great coffee and fresh brunch just moments from Kabalana Beach.",
          "",
          "Café Ceylon A peaceful garden café serving great coffee, breakfast and relaxed lunches.",
          "",
          "Maria Bonita One of Ahangama's best all-day cafés for long lunches, coffee and easy afternoons.",
          "",
          "Show your Ahangama Pass for Perks & Discounts",
          "",
          "Eats Ahangama Guide: https://ahangama.com/eat",
          "Best Cafes - Google Maps: https://maps.app.goo.gl/UVcgCofbwbGrprxv9",
        ].join("\n"),
      };

    case "venue_feature":
      return {
        templateName: "venue_feature",
        languageCode: "en_GB",
        variables: {
          first_name: "there",
          venue_name: cleanLine(content.venueName),
          description: cleanLine(content.description),
          offer: cleanLine(content.offer),
          url: content.url.trim(),
        },
        preview: [
          "Hi there 👋",
          "",
          `Today’s Ahangama pick is ${cleanLine(content.venueName)}.`,
          "",
          cleanLine(content.description),
          "",
          cleanLine(content.offer),
          "",
          "Discover more:",
          content.url.trim(),
        ].join("\n"),
      };

    case "wellness_pick":
      return {
        templateName: "wellness_pick",
        languageCode: "en_GB",
        variables: {
          first_name: "there",
          venue_name: cleanLine(content.venueName),
          description: cleanLine(content.description),
          practical_detail: cleanLine(content.practicalDetail),
          url: content.url.trim(),
        },
        preview: [
          "Hi there 🌿",
          "",
          `Today’s wellness pick is ${cleanLine(content.venueName)}.`,
          "",
          cleanLine(content.description),
          "",
          cleanLine(content.practicalDetail),
          "",
          "View details:",
          content.url.trim(),
        ].join("\n"),
      };
  }
}
