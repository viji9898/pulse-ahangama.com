import {
  and,
  eq,
  ilike,
  inArray,
  isNotNull,
  lte,
  gte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import {
  guestInterests,
  guests,
  guestStays,
  messages,
} from "../../../db/schema/index.js";
import { db } from "./db.js";

export type CampaignAudienceDefinition = {
  search?: string;
  interests?: string[];
  accommodationName?: string;
  currentlyStaying?: boolean;
  whatsappOptIn?: boolean;
  excludeRecentlyMessagedHours?: number;
};

export type CampaignAudienceGuest = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  normalizedPhoneNumber: string | null;
  accommodationName: string | null;
  arrivalDate: Date | null;
  departureDate: Date | null;
};

export async function findCampaignAudience(
  definition: CampaignAudienceDefinition,
): Promise<CampaignAudienceGuest[]> {
  const filters = [isNotNull(guests.normalizedPhoneNumber)];

  if (definition.whatsappOptIn !== false) {
    filters.push(eq(guests.whatsappOptIn, true));
  }

  if (definition.search?.trim()) {
    const query = `%${definition.search.trim()}%`;

    filters.push(
      or(
        ilike(guests.firstName, query),
        ilike(guests.lastName, query),
        ilike(guests.email, query),
        ilike(guests.phoneNumber, query),
      )!,
    );
  }

  if (definition.accommodationName?.trim()) {
    filters.push(
      ilike(
        guestStays.accommodationName,
        `%${definition.accommodationName.trim()}%`,
      ),
    );
  }

  if (definition.currentlyStaying) {
    const now = new Date();

    filters.push(
      and(
        lte(guestStays.arrivalDate, now),
        gte(guestStays.departureDate, now),
      )!,
    );
  }

  if (
    definition.excludeRecentlyMessagedHours &&
    definition.excludeRecentlyMessagedHours > 0
  ) {
    const threshold = new Date(
      Date.now() - definition.excludeRecentlyMessagedHours * 60 * 60 * 1000,
    );

    const recentGuests = await db
      .selectDistinct({
        guestId: messages.guestId,
      })
      .from(messages)
      .where(
        and(
          eq(messages.direction, "outbound"),
          gte(messages.createdAt, threshold),
        ),
      );

    const excludedGuestIds = recentGuests.map((item) => item.guestId);

    if (excludedGuestIds.length) {
      filters.push(notInArray(guests.id, excludedGuestIds));
    }
  }

  const interestFilter = definition.interests?.length
    ? inArray(guestInterests.interest, definition.interests)
    : undefined;

  const results = await db
    .selectDistinct({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      phoneNumber: guests.phoneNumber,
      normalizedPhoneNumber: guests.normalizedPhoneNumber,
      accommodationName: guestStays.accommodationName,
      arrivalDate: guestStays.arrivalDate,
      departureDate: guestStays.departureDate,
      createdAt: guests.createdAt,
    })
    .from(guests)
    .leftJoin(guestStays, eq(guestStays.guestId, guests.id))
    .leftJoin(guestInterests, eq(guestInterests.guestId, guests.id))
    .where(and(...filters, interestFilter))
    .orderBy(sql`${guests.createdAt} desc`)
    .limit(5000);

  return results;
}
