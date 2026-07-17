import "dotenv/config";
import process from "node:process";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
  guests,
  testAudienceMembers,
  testAudiences,
} from "../db/schema/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const db = drizzle(process.env.DATABASE_URL);

const TEST_AUDIENCE_NAME = "Internal Test";

const contacts = [
  {
    firstName: "Viji UK",
    phoneNumber: "447723772377",
    email: "viji@viji.com",
    countryCode: "GB",
  },
  {
    firstName: "Veronika",
    phoneNumber: "94777994411",
    email: "x@viji.com",
    countryCode: "LK",
  },
  {
    firstName: "Minosha",
    phoneNumber: "94772733217",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Ishaq",
    phoneNumber: "94778746478",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Faizan",
    phoneNumber: "94761107262",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Venushka",
    phoneNumber: "94761518174",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Enidu",
    phoneNumber: "94778746815",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Shoaib",
    phoneNumber: "94702725729",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Vishmi",
    phoneNumber: "94772733202",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Viji SL",
    phoneNumber: "94777322500",
    email: null,
    countryCode: "LK",
  },
  {
    firstName: "Tereza",
    phoneNumber: "201010001133",
    email: null,
    countryCode: "EG",
  },
  {
    firstName: "Courtney",
    phoneNumber: "27718682508",
    email: null,
    countryCode: "ZA",
  },
];

function normalizePhoneNumber(value: string): string {
  const normalized = value.replace(/\D/g, "");

  if (!normalized) {
    throw new Error(`Invalid phone number: ${value}`);
  }

  return normalized;
}

async function main(): Promise<void> {
  const [existingAudience] = await db
    .select()
    .from(testAudiences)
    .where(eq(testAudiences.name, TEST_AUDIENCE_NAME))
    .limit(1);

  const audience =
    existingAudience ??
    (
      await db
        .insert(testAudiences)
        .values({
          name: TEST_AUDIENCE_NAME,
          description: "Ahangama team campaign testing",
          active: true,
        })
        .returning()
    )[0];

  for (const contact of contacts) {
    const normalizedPhoneNumber = normalizePhoneNumber(contact.phoneNumber);

    const [guest] = await db
      .insert(guests)
      .values({
        firstName: contact.firstName,
        email: contact.email,
        phoneNumber: `+${normalizedPhoneNumber}`,
        normalizedPhoneNumber,
        countryCode: contact.countryCode,
        whatsappOptIn: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: guests.normalizedPhoneNumber,
        set: {
          firstName: contact.firstName,
          email: contact.email,
          phoneNumber: `+${normalizedPhoneNumber}`,
          countryCode: contact.countryCode,
          whatsappOptIn: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .insert(testAudienceMembers)
      .values({
        audienceId: audience.id,
        guestId: guest.id,
      })
      .onConflictDoNothing({
        target: [testAudienceMembers.audienceId, testAudienceMembers.guestId],
      });

    console.log(`Added: ${contact.firstName} (+${normalizedPhoneNumber})`);
  }

  console.log(
    `\n${contacts.length} contacts added to "${TEST_AUDIENCE_NAME}".`,
  );
}

main().catch((error) => {
  console.error("Unable to seed test audience:", error);
  process.exitCode = 1;
});
