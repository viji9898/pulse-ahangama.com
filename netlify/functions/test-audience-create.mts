import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
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
  name?: string;
  description?: string;
  active?: boolean;
  members?: AudienceMemberInput[];
};

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const input = (await request.json()) as RequestBody;
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

  if (!name) {
    return Response.json(
      { error: "Audience name is required" },
      { status: 400 },
    );
  }

  if (!uniqueMembers.length || uniqueMembers.length > 20) {
    return Response.json(
      {
        error: "A test audience must contain between 1 and 20 guests",
      },
      { status: 400 },
    );
  }

  const audience = await db.transaction(async (tx) => {
    let savedAudience;

    if (input.audienceId) {
      const [updated] = await tx
        .update(testAudiences)
        .set({
          name,
          description: input.description?.trim() || null,
          active: input.active ?? true,
          updatedAt: new Date(),
        })
        .where(eq(testAudiences.id, input.audienceId))
        .returning();

      if (!updated) {
        throw new Error("Test audience not found");
      }

      await tx
        .delete(testAudienceMembers)
        .where(eq(testAudienceMembers.audienceId, input.audienceId));

      savedAudience = updated;
    } else {
      [savedAudience] = await tx
        .insert(testAudiences)
        .values({
          name,
          description: input.description?.trim() || null,
          active: input.active ?? true,
        })
        .returning();
    }

    const guestIds: string[] = [];

    for (const member of uniqueMembers) {
      const [guest] = await tx
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

    await tx.insert(testAudienceMembers).values(
      guestIds.map((guestId) => ({
        audienceId: savedAudience.id,
        guestId,
      })),
    );

    return savedAudience;
  });

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
