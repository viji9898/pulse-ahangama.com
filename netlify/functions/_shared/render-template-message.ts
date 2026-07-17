export function renderTemplateMessage(input: {
  templateName: string;
  variables: Record<string, string>;
}): string {
  const { templateName, variables } = input;

  if (templateName === "whats_on_today") {
    return [
      "What’s on in Ahangama Today?",
      "",
      `Hi ${variables.customer_name || "there"} 👋`,
      "",
      "Here’s what’s happening around Ahangama today:",
      "",
      variables.event_1,
      "",
      variables.event_2,
      "",
      variables.event_3,
      "",
      "Enjoy your day in Ahangama 🌴",
      "",
      "Ahangama Events: https://ahangama.com/events",
      "Our Wellness Picks: https://ahangama.com/wellness",
    ]
      .filter((value) => value !== undefined)
      .join("\n");
  }

  if (templateName === "featured_cafes") {
    return [
      "Best Cafés in Ahangama",
      "",
      `👋 Hey ${variables.first_name || "there"}!`,
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
    ].join("\n");
  }

  if (templateName === "ahangama_guide_2026_27") {
    return [
      "The Ahangama Guide 2026/27",
      "",
      `Hi 👋 ${variables.customer_name || "there"}`,
      "Welcome to Ahangama!",
      "",
      "We’ve put together our 2026/27 Ahangama Guide, a curated collection of our favourite cafés, stays, wellness spots, restaurants, surf breaks and local experiences.",
      "",
      "Everything is personally recommended by our local team to help you make the most of your stay.",
      "",
      "👇 Tap below to explore.",
      "",
      "The Ahangama Guide 2026/27 Season Curated by locals",
      "",
      "Open the Guide: https://ahangama.com/guide?utm_source=whatsapp&utm_medium=message&utm_campaign=ahangama_guide_2026_27&utm_content=broadcast_v1",
      "Get Recommendations",
    ].join("\n");
  }

  return `[Template: ${templateName}]`;
}