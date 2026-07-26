type InboundAlertMessage = {
  body: string | null;
  createdAt: Date;
};

type InboundMessageAlert = {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  messages: InboundAlertMessage[];
};

export type InboundMessageEmail = {
  subject: string;
  text: string;
  html: string;
};

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatReceivedAt(value: Date): string {
  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  });
}

export function buildInboundMessageEmail(
  alert: InboundMessageAlert,
): InboundMessageEmail {
  const contactName = [alert.firstName, alert.lastName]
    .filter(Boolean)
    .join(" ") || "WhatsApp contact";
  const phoneNumber = alert.phoneNumber || "Not available";
  const whatsappNumber = phoneNumber.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : null;
  const safeSubjectName = contactName.replace(/[\r\n]+/g, " ");
  const messageText = alert.messages
    .map(
      (message, index) =>
        `${index + 1}. ${message.body || "[Unsupported WhatsApp message]"}\nReceived: ${formatReceivedAt(message.createdAt)}`,
    )
    .join("\n\n");
  const messageHtml = alert.messages
    .map(
      (message) => `
        <div style="margin: 0 0 16px; padding: 14px 16px; background: #f6f7f8; border-left: 3px solid #25d366;">
          <div style="white-space: pre-wrap; color: #1f2937;">${escapeHtml(message.body || "[Unsupported WhatsApp message]")}</div>
          <div style="margin-top: 8px; color: #6b7280; font-size: 12px;">Received ${escapeHtml(formatReceivedAt(message.createdAt))}</div>
        </div>`,
    )
    .join("");

  return {
    subject: `New Message Alert ${safeSubjectName}, WhatsApp number ${phoneNumber}`,
    text: [
      "New WhatsApp message",
      "",
      `Contact name: ${contactName}`,
      `WhatsApp number: ${phoneNumber}`,
      "",
      "Message:",
      messageText,
      ...(whatsappUrl ? ["", `Message contact on WhatsApp: ${whatsappUrl}`] : []),
    ].join("\n"),
    html: `
      <div style="max-width: 640px; margin: 0 auto; font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 22px; margin: 0 0 20px;">New WhatsApp message</h1>
        <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #6b7280;"><strong>Contact name</strong></td>
            <td style="padding: 6px 0;">${escapeHtml(contactName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #6b7280;"><strong>WhatsApp number</strong></td>
            <td style="padding: 6px 0;">${escapeHtml(phoneNumber)}</td>
          </tr>
        </table>
        <h2 style="font-size: 16px; margin: 0 0 12px;">${alert.messages.length === 1 ? "Message" : `${alert.messages.length} new messages`}</h2>
        ${messageHtml}
        ${
          whatsappUrl
            ? `<a href="${whatsappUrl}" style="display: inline-block; margin-top: 8px; padding: 11px 18px; border-radius: 6px; background: #128c7e; color: #ffffff; font-weight: 700; text-decoration: none;">Message contact on WhatsApp</a>`
            : ""
        }
      </div>`,
  };
}

export async function sendInboundMessageEmail(
  email: InboundMessageEmail,
): Promise<void> {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [
            {
              email: process.env.INBOUND_ALERT_EMAIL || "hello@viji.com",
            },
          ],
        },
      ],
      from: {
        email: required("SENDGRID_FROM_EMAIL"),
        name: process.env.SENDGRID_FROM_NAME || "Ahangama",
      },
      subject: email.subject,
      content: [
        { type: "text/plain", value: email.text },
        { type: "text/html", value: email.html },
      ],
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `SendGrid rejected the alert (${response.status}): ${responseBody.slice(0, 500)}`,
    );
  }
}