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

  return `[Template: ${templateName}]`;
}