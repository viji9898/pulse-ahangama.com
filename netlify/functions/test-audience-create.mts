import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import {
  guests,
  testAudienceMembers,
  testAudiences,
} from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

type AudienceMemberInput = {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string;
  countryCode?: string | null;
};

type RequestBody = {
  audienceId?: string;
  kind?: "test" | "live";
  name?: string;
  description?: string;
  active?: boolean;
  members?: AudienceMemberInput[];
};

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

function parseAudienceKind(value: RequestBody["kind"]): "test" | "live" {
  return value === "live" ? "live" : "test";
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const input = (await request.json()) as RequestBody;
  const audienceKind = parseAudienceKind(input.kind);
  const name = input.name?.trim();
  const members = (input.members ?? [])
    .map((member) => {
      const normalizedPhoneNumber = normalizePhoneNumber(member.phoneNumber ?? "");

      return {
        firstName: member.firstName?.trim() || null,
        lastName: member.lastName?.trim() || null,
        phoneNumber: normalizedPhoneNumber ? `+${normalizedPhoneNumber}` : null,
        normalizedPhoneNumber,
        countryCode: member.countryCode?.trim()?.toUpperCase() || "LK",
      };
    })
    .filter((member) => member.normalizedPhoneNumber.length > 0);

  const uniqueMembers = Array.from(
    new Map(
      members.map((member) => [member.normalizedPhoneNumber, member]),
    ).values(),
  );
  const minMembers = audienceKind === "live" ? 0 : 1;

  if (!name) {
    return Response.json(
      { error: "Audience name is required" },
      { status: 400 },
    );
  }

  if (uniqueMembers.length < minMembers || uniqueMembers.length > 20) {
    return Response.json(
      {
        error:
          audienceKind === "live"
            ? "A live audience can contain up to 20 guests"
            : "A test audience must contain between 1 and 20 guests",
      },
      { status: 400 },
    );
  }

  let audience;

  if (input.audienceId) {
    const [updated] = await db
      .update(testAudiences)
      .set({
        name,
        description: input.description?.trim() || null,
        active: input.active ?? true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(testAudiences.id, input.audienceId),
          eq(testAudiences.kind, audienceKind),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Test audience not found");
    }

    await db
      .delete(testAudienceMembers)
      .where(eq(testAudienceMembers.audienceId, input.audienceId));

    audience = updated;
  } else {
    [audience] = await db
      .insert(testAudiences)
      .values({
        kind: audienceKind,
        name,
        description: input.description?.trim() || null,
        active: input.active ?? true,
      })
      .returning();
  }

  const guestIds: string[] = [];

  for (const member of uniqueMembers) {
    const [guest] = await db
      .insert(guests)
      .values({
        firstName: member.firstName,
        lastName: member.lastName,
        phoneNumber: member.phoneNumber,
        normalizedPhoneNumber: member.normalizedPhoneNumber,
        countryCode: member.countryCode,
        whatsappOptIn: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: guests.normalizedPhoneNumber,
        set: {
          firstName: member.firstName,
          lastName: member.lastName,
          phoneNumber: member.phoneNumber,
          countryCode: member.countryCode,
          whatsappOptIn: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    guestIds.push(guest.id);
  }

  if (guestIds.length > 0) {
    await db.insert(testAudienceMembers).values(
      guestIds.map((guestId) => ({
        audienceId: audience.id,
        guestId,
      })),
    );
  }

  return Response.json(
    {
      ok: true,
      audience,
      memberCount: uniqueMembers.length,
    },
    { status: 201 },
  );
};

export const config: Config = {
  path: "/api/test-audiences/create",
};
