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
  testAudienceMembers,
  testAudiences,
} from "../../../db/schema/index.js";
import { db } from "./db.js";
import { getLiveAudienceMembers, listLiveAudiences } from "./live-audiences.js";

export type CampaignAudienceDefinition = {
  audienceIds?: string[];
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
  email: string | null;
  phoneNumber: string | null;
  normalizedPhoneNumber: string | null;
  countryCode: string | null;
  accommodationName: string | null;
  arrivalDate: Date | null;
  departureDate: Date | null;
};

type CampaignAudienceSource = {
  audienceId: string;
  audienceName: string;
};

export type CampaignAudienceMember = CampaignAudienceGuest & {
  guestBacked: boolean;
  sources: CampaignAudienceSource[];
};

function dedupeMembersByPhone(
  members: CampaignAudienceMember[],
): CampaignAudienceMember[] {
  const byPhone = new Map<string, CampaignAudienceMember>();

  for (const member of members) {
    const phone = member.normalizedPhoneNumber;

    if (!phone) {
      continue;
    }

    const existing = byPhone.get(phone);

    if (!existing) {
      byPhone.set(phone, member);
      continue;
    }

    const mergedSources = new Map(
      [...existing.sources, ...member.sources].map((source) => [
        source.audienceId,
        source,
      ]),
    );

    const primary = existing.guestBacked
      ? existing
      : member.guestBacked
        ? member
        : existing;
    const secondary = primary === existing ? member : existing;

    byPhone.set(phone, {
      ...primary,
      firstName: primary.firstName ?? secondary.firstName,
      lastName: primary.lastName ?? secondary.lastName,
      email: primary.email ?? secondary.email,
      phoneNumber: primary.phoneNumber ?? secondary.phoneNumber,
      countryCode: primary.countryCode ?? secondary.countryCode,
      accommodationName:
        primary.accommodationName ?? secondary.accommodationName,
      arrivalDate: primary.arrivalDate ?? secondary.arrivalDate,
      departureDate: primary.departureDate ?? secondary.departureDate,
      guestBacked: existing.guestBacked || member.guestBacked,
      sources: Array.from(mergedSources.values()),
    });
  }

  return Array.from(byPhone.values());
}

async function findSavedAudienceMembers(
  audienceIds: string[],
): Promise<CampaignAudienceMember[]> {
  if (!audienceIds.length) {
    return [];
  }

  const liveAudiences = await listLiveAudiences();
  const liveAudienceNames = new Map(
    liveAudiences.map((audience) => [audience.id, audience.name]),
  );
  const testAudienceIds: string[] = [];
  const liveMembers: CampaignAudienceMember[] = [];

  for (const audienceId of audienceIds) {
    const audienceMembers = await getLiveAudienceMembers(audienceId);

    if (audienceMembers != null) {
      const audienceName = liveAudienceNames.get(audienceId) ?? audienceId;

      liveMembers.push(
        ...audienceMembers
          .filter(
            (member) =>
              member.whatsappOptIn === true &&
              member.normalizedPhoneNumber != null,
          )
          .map<CampaignAudienceMember>((member) => ({
            id: member.guestId,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phoneNumber: member.phoneNumber,
            normalizedPhoneNumber: member.normalizedPhoneNumber,
            countryCode: null,
            accommodationName: null,
            arrivalDate: null,
            departureDate: null,
            guestBacked: false,
            sources: [
              {
                audienceId,
                audienceName,
              },
            ],
          })),
      );

      continue;
    }

    testAudienceIds.push(audienceId);
  }

  const rows = testAudienceIds.length
    ? await db
        .select({
          audienceId: testAudiences.id,
          audienceName: testAudiences.name,
          id: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          email: guests.email,
          phoneNumber: guests.phoneNumber,
          normalizedPhoneNumber: guests.normalizedPhoneNumber,
          countryCode: guests.countryCode,
          accommodationName: sql<string | null>`null`,
          arrivalDate: sql<Date | null>`null`,
          departureDate: sql<Date | null>`null`,
        })
        .from(testAudienceMembers)
        .innerJoin(guests, eq(testAudienceMembers.guestId, guests.id))
        .innerJoin(testAudiences, eq(testAudienceMembers.audienceId, testAudiences.id))
        .where(
          and(
            inArray(testAudienceMembers.audienceId, testAudienceIds),
            eq(testAudiences.kind, "test"),
            eq(testAudiences.active, true),
            isNotNull(guests.normalizedPhoneNumber),
            eq(guests.whatsappOptIn, true),
          ),
        )
    : [];

  const members = rows.map<CampaignAudienceMember>((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    normalizedPhoneNumber: row.normalizedPhoneNumber,
    countryCode: row.countryCode,
    accommodationName: row.accommodationName,
    arrivalDate: row.arrivalDate,
    departureDate: row.departureDate,
    guestBacked: true,
    sources: [
      {
        audienceId: row.audienceId,
        audienceName: row.audienceName,
      },
    ],
  }));

  return ensureGuestRecords(dedupeMembersByPhone([...members, ...liveMembers]));
}

async function ensureGuestRecords(
  members: CampaignAudienceMember[],
): Promise<CampaignAudienceMember[]> {
  const unresolvedMembers = members.filter(
    (member) => member.guestBacked === false && member.normalizedPhoneNumber,
  );

  if (!unresolvedMembers.length) {
    return members;
  }

  const phoneNumbers = Array.from(
    new Set(
      unresolvedMembers
        .map((member) => member.normalizedPhoneNumber)
        .filter((phone): phone is string => Boolean(phone)),
    ),
  );

  if (!phoneNumbers.length) {
    return members;
  }

  const existingGuests = await db
    .select()
    .from(guests)
    .where(inArray(guests.normalizedPhoneNumber, phoneNumbers));

  const existingByPhone = new Map(
    existingGuests
      .filter(
        (guest): guest is typeof existingGuests[number] & {
          normalizedPhoneNumber: string;
        } => guest.normalizedPhoneNumber != null,
      )
      .map((guest) => [guest.normalizedPhoneNumber, guest]),
  );

  const guestsToCreate = unresolvedMembers
    .filter(
      (member) =>
        member.normalizedPhoneNumber != null &&
        existingByPhone.has(member.normalizedPhoneNumber) === false,
    )
    .map((member) => ({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phoneNumber: member.phoneNumber ?? `+${member.normalizedPhoneNumber!}`,
      normalizedPhoneNumber: member.normalizedPhoneNumber!,
      countryCode: member.countryCode,
      whatsappOptIn: true,
      updatedAt: new Date(),
    }));

  if (guestsToCreate.length) {
    await db.insert(guests).values(guestsToCreate).onConflictDoNothing({
      target: guests.normalizedPhoneNumber,
    });
  }

  const resolvedGuests = await db
    .select()
    .from(guests)
    .where(inArray(guests.normalizedPhoneNumber, phoneNumbers));

  const resolvedByPhone = new Map(
    resolvedGuests
      .filter(
        (guest): guest is typeof resolvedGuests[number] & {
          normalizedPhoneNumber: string;
        } => guest.normalizedPhoneNumber != null,
      )
      .map((guest) => [guest.normalizedPhoneNumber, guest]),
  );

  return members.map((member) => {
    if (member.guestBacked || !member.normalizedPhoneNumber) {
      return member;
    }

    const guest = resolvedByPhone.get(member.normalizedPhoneNumber);

    if (!guest) {
      return member;
    }

    return {
      ...member,
      id: guest.id,
      firstName: guest.firstName ?? member.firstName,
      lastName: guest.lastName ?? member.lastName,
      email: guest.email ?? member.email,
      phoneNumber: guest.phoneNumber ?? member.phoneNumber,
      normalizedPhoneNumber: guest.normalizedPhoneNumber,
      countryCode: guest.countryCode ?? member.countryCode,
      guestBacked: true,
    };
  });
}

export async function findCampaignAudience(
  definition: CampaignAudienceDefinition,
): Promise<CampaignAudienceMember[]> {
  if (definition.audienceIds?.length) {
    return findSavedAudienceMembers(definition.audienceIds);
  }

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
      email: guests.email,
      phoneNumber: guests.phoneNumber,
      normalizedPhoneNumber: guests.normalizedPhoneNumber,
      countryCode: guests.countryCode,
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

  return results.map((result) => ({
    ...result,
    guestBacked: true,
    sources: [],
  }));
}
