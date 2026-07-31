import { sql } from "drizzle-orm";
import { passDb } from "./pass-db.js";

export type LiveAudienceKey = "circle" | "hospo" | "pass_guests";

type LiveAudienceDefinition = {
  key: LiveAudienceKey;
  label: string;
  description: string;
};

type CountRow = {
  count: number;
};

type CircleRow = {
  id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  member_type: string | null;
  venue_name: string | null;
  pass_status: string | null;
};

type HospoRow = {
  id: string;
  pass_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source_hotel_slug: string | null;
  audience_type: string | null;
  whatsapp_opt_in: boolean | null;
  wants_partner_updates: boolean | null;
};

type PassGuestRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  source_hotel_slug: string | null;
  destination: string | null;
  whatsapp_opt_in: boolean | null;
  marketing_consent: boolean | null;
};

export type LiveAudienceMemberRecord = {
  guestId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  normalizedPhoneNumber: string | null;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
  memberType?: string | null;
  audienceType?: string | null;
  sourceHotelSlug?: string | null;
  country?: string | null;
  destination?: string | null;
  passStatus?: string | null;
  venueName?: string | null;
};

export type SaveLiveAudienceMemberInput = {
  audienceId: string;
  memberId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber?: string | null;
  whatsappOptIn?: boolean;
  emailOptIn?: boolean;
  memberType?: string | null;
  audienceType?: string | null;
  sourceHotelSlug?: string | null;
  country?: string | null;
  destination?: string | null;
  venueName?: string | null;
};

function joinName(firstName?: string | null, lastName?: string | null): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function trimToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const liveAudienceDefinitions: LiveAudienceDefinition[] = [
  {
    key: "circle",
    label: "circle",
    description: "Dynamic live audience from the Ahangama Pass circle table.",
  },
  {
    key: "hospo",
    label: "hospo",
    description:
      "Dynamic live audience from the Ahangama Pass hospo_pass_profiles table.",
  },
  {
    key: "pass_guests",
    label: "pass_guests",
    description:
      "Dynamic live audience from the Ahangama Pass pass_guests table.",
  },
];

function getAudienceId(key: LiveAudienceKey): string {
  return `live:${key}`;
}

function parseAudienceId(value: string): LiveAudienceKey | null {
  const normalized = value.startsWith("live:") ? value.slice(5) : value;

  if (
    normalized === "circle" ||
    normalized === "hospo" ||
    normalized === "pass_guests"
  ) {
    return normalized;
  }

  return null;
}

function normalizePhoneNumber(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function splitFullName(value: string | null): {
  firstName: string | null;
  lastName: string | null;
} {
  const trimmed = value?.trim();

  if (!trimmed) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

async function getLiveAudienceCount(key: LiveAudienceKey): Promise<number> {
  let rows: CountRow[] = [];

  if (key === "circle") {
    rows = (await passDb.execute(sql`select count(*)::int as count from circle`))
      .rows as CountRow[];
  }

  if (key === "hospo") {
    rows = (
      await passDb.execute(
        sql`select count(*)::int as count from hospo_pass_profiles`,
      )
    ).rows as CountRow[];
  }

  if (key === "pass_guests") {
    rows = (
      await passDb.execute(sql`select count(*)::int as count from pass_guests`)
    ).rows as CountRow[];
  }

  return Number(rows[0]?.count ?? 0);
}

export async function listLiveAudiences() {
  const counts = await Promise.all(
    liveAudienceDefinitions.map(async (definition) => ({
      definition,
      memberCount: await getLiveAudienceCount(definition.key),
    })),
  );

  return counts.map(({ definition, memberCount }) => ({
    id: getAudienceId(definition.key),
    kind: "live" as const,
    name: definition.label,
    description: definition.description,
    active: true,
    memberCount,
    createdAt: new Date(0).toISOString(),
  }));
}

export async function getLiveAudienceMembers(audienceId: string) {
  const key = parseAudienceId(audienceId);

  if (!key) {
    return null;
  }

  if (key === "circle") {
    const rows = (
      await passDb.execute(
        sql`select id, name, email, mobile, member_type, venue_name, pass_status from circle order by name asc nulls last`,
      )
    ).rows as CircleRow[];

    return rows.map<LiveAudienceMemberRecord>((row) => {
      const fullName = splitFullName(row.name);

      return {
        guestId: row.id,
        firstName: fullName.firstName,
        lastName: fullName.lastName,
        email: row.email,
        phoneNumber: row.mobile,
        normalizedPhoneNumber: normalizePhoneNumber(row.mobile),
        whatsappOptIn: false,
        emailOptIn: false,
        memberType: row.member_type,
        venueName: row.venue_name,
        passStatus: row.pass_status,
      };
    });
  }

  if (key === "hospo") {
    const rows = (
      await passDb.execute(
        sql`select id, pass_id, full_name, email, phone, source_hotel_slug, audience_type, whatsapp_opt_in, wants_partner_updates from hospo_pass_profiles order by full_name asc nulls last`,
      )
    ).rows as HospoRow[];

    return rows.map<LiveAudienceMemberRecord>((row) => {
      const fullName = splitFullName(row.full_name);

      return {
        guestId: row.id,
        firstName: fullName.firstName,
        lastName: fullName.lastName,
        email: row.email,
        phoneNumber: row.phone,
        normalizedPhoneNumber: normalizePhoneNumber(row.phone),
        whatsappOptIn: row.whatsapp_opt_in ?? false,
        emailOptIn: row.wants_partner_updates ?? false,
        audienceType: row.audience_type,
        sourceHotelSlug: row.source_hotel_slug,
      };
    });
  }

  const rows = (
    await passDb.execute(
      sql`select id, full_name, email, phone, country, source_hotel_slug, destination, whatsapp_opt_in, marketing_consent from pass_guests order by full_name asc nulls last`,
    )
  ).rows as PassGuestRow[];

  return rows.map<LiveAudienceMemberRecord>((row) => {
    const fullName = splitFullName(row.full_name);

    return {
      guestId: row.id,
      firstName: fullName.firstName,
      lastName: fullName.lastName,
      email: row.email,
      phoneNumber: row.phone,
      normalizedPhoneNumber: normalizePhoneNumber(row.phone),
      whatsappOptIn: row.whatsapp_opt_in ?? false,
      emailOptIn: row.marketing_consent ?? false,
      sourceHotelSlug: row.source_hotel_slug,
      country: row.country,
      destination: row.destination,
    };
  });
}

export async function saveLiveAudienceMember(input: SaveLiveAudienceMemberInput) {
  const key = parseAudienceId(input.audienceId);

  if (!key) {
    throw new Error("Invalid live audience");
  }

  const email = normalizeEmail(input.email);
  const fullName = joinName(input.firstName, input.lastName);
  const phoneNumber = trimToNull(input.phoneNumber);

  if (!email) {
    throw new Error("Email is required");
  }

  if (key === "circle") {
    const memberType = trimToNull(input.memberType);

    if (!fullName) {
      throw new Error("Name is required");
    }

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    if (!memberType) {
      throw new Error("Member type is required");
    }

    if (input.memberId) {
      await passDb.execute(sql`
        update circle
        set name = ${fullName},
            email = ${email},
            mobile = ${phoneNumber},
            member_type = ${memberType},
            venue_name = ${trimToNull(input.venueName)},
            updated_at = now()
        where id = ${input.memberId}
      `);
    } else {
      await passDb.execute(sql`
        insert into circle (name, email, mobile, member_type, venue_name)
        values (${fullName}, ${email}, ${phoneNumber}, ${memberType}, ${trimToNull(input.venueName)})
      `);
    }

    return;
  }

  if (key === "hospo") {
    const audienceType = trimToNull(input.audienceType);

    if (!audienceType) {
      throw new Error("Audience type is required");
    }

    if (input.memberId) {
      const existingRows = await passDb.execute(sql`
        select pass_id
        from hospo_pass_profiles
        where id = ${input.memberId}
        limit 1
      `);

      const existing = existingRows.rows[0] as { pass_id: string } | undefined;

      if (!existing) {
        throw new Error("Hospo member not found");
      }

      await passDb.execute(sql`
        update hospo_pass_profiles
        set full_name = ${fullName || null},
            email = ${email},
            phone = ${phoneNumber},
            source_hotel_slug = ${trimToNull(input.sourceHotelSlug)},
            audience_type = ${audienceType},
            whatsapp_opt_in = ${input.whatsappOptIn ?? false},
            wants_partner_updates = ${input.emailOptIn ?? false},
            updated_at = now()
        where id = ${input.memberId}
      `);

      await passDb.execute(sql`
        update passes
        set source_hotel_slug = ${trimToNull(input.sourceHotelSlug)},
            updated_at = now()
        where id = ${existing.pass_id}
      `);
    } else {
      const guestId = crypto.randomUUID();
      const passRows = await passDb.execute(sql`
        insert into passes (guest_id, source_hotel_slug)
        values (${guestId}, ${trimToNull(input.sourceHotelSlug)})
        returning id
      `);

      const pass = passRows.rows[0] as { id: string } | undefined;

      if (!pass) {
        throw new Error("Unable to create hospo pass");
      }

      await passDb.execute(sql`
        insert into hospo_pass_profiles (
          pass_id,
          guest_id,
          full_name,
          email,
          phone,
          source_hotel_slug,
          audience_type,
          whatsapp_opt_in,
          wants_partner_updates
        )
        values (
          ${pass.id},
          ${guestId},
          ${fullName || null},
          ${email},
          ${phoneNumber},
          ${trimToNull(input.sourceHotelSlug)},
          ${audienceType},
          ${input.whatsappOptIn ?? false},
          ${input.emailOptIn ?? false}
        )
      `);
    }

    return;
  }

  if (!fullName) {
    throw new Error("Name is required");
  }

  if (input.memberId) {
    await passDb.execute(sql`
      update pass_guests
      set full_name = ${fullName},
          email = ${email},
          phone = ${phoneNumber},
          country = ${trimToNull(input.country)},
          source_hotel_slug = ${trimToNull(input.sourceHotelSlug)},
          destination = ${trimToNull(input.destination)},
          whatsapp_opt_in = ${input.whatsappOptIn ?? false},
          marketing_consent = ${input.emailOptIn ?? false},
          normalized_email = ${email},
          updated_at = now()
      where id = ${input.memberId}
    `);
  } else {
    await passDb.execute(sql`
      insert into pass_guests (
        full_name,
        email,
        phone,
        country,
        whatsapp_opt_in,
        marketing_consent,
        source_hotel_slug,
        destination,
        normalized_email
      )
      values (
        ${fullName},
        ${email},
        ${phoneNumber},
        ${trimToNull(input.country)},
        ${input.whatsappOptIn ?? false},
        ${input.emailOptIn ?? false},
        ${trimToNull(input.sourceHotelSlug)},
        ${trimToNull(input.destination)},
        ${email}
      )
    `);
  }
}

export async function deleteLiveAudienceMember(audienceId: string, memberId: string) {
  const key = parseAudienceId(audienceId);

  if (!key) {
    throw new Error("Invalid live audience");
  }

  if (key === "circle") {
    await passDb.execute(sql`delete from circle where id = ${memberId}`);
    return;
  }

  if (key === "hospo") {
    const rows = await passDb.execute(sql`
      select pass_id
      from hospo_pass_profiles
      where id = ${memberId}
      limit 1
    `);

    const existing = rows.rows[0] as { pass_id: string } | undefined;

    await passDb.execute(sql`delete from hospo_pass_profiles where id = ${memberId}`);

    if (existing?.pass_id) {
      const remainingRows = await passDb.execute(sql`
        select count(*)::int as count
        from hospo_pass_profiles
        where pass_id = ${existing.pass_id}
      `);

      const remaining = remainingRows.rows[0] as { count: number } | undefined;

      if (Number(remaining?.count ?? 0) === 0) {
        await passDb.execute(sql`delete from passes where id = ${existing.pass_id}`);
      }
    }

    return;
  }

  await passDb.execute(sql`delete from pass_guests where id = ${memberId}`);
}