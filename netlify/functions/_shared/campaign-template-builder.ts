import type { CampaignContent } from "./campaign-content-types.js";

export type BuiltCampaignTemplate = {
  templateName: string;
  languageCode: string;
  variables: Record<string, string>;
  preview: string;
};

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
