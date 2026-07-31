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
  mobile: string | null;
};

type HospoRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp_opt_in: boolean | null;
  wants_partner_updates: boolean | null;
};

type PassGuestRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp_opt_in: boolean | null;
  marketing_consent: boolean | null;
};

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
        sql`select id, name, mobile from circle order by name asc nulls last`,
      )
    ).rows as CircleRow[];

    return rows.map((row) => {
      const fullName = splitFullName(row.name);

      return {
        guestId: row.id,
        firstName: fullName.firstName,
        lastName: fullName.lastName,
        phoneNumber: row.mobile,
        normalizedPhoneNumber: normalizePhoneNumber(row.mobile),
        whatsappOptIn: false,
        emailOptIn: false,
      };
    });
  }

  if (key === "hospo") {
    const rows = (
      await passDb.execute(
        sql`select id, full_name, phone, whatsapp_opt_in, wants_partner_updates from hospo_pass_profiles order by full_name asc nulls last`,
      )
    ).rows as HospoRow[];

    return rows.map((row) => {
      const fullName = splitFullName(row.full_name);

      return {
        guestId: row.id,
        firstName: fullName.firstName,
        lastName: fullName.lastName,
        phoneNumber: row.phone,
        normalizedPhoneNumber: normalizePhoneNumber(row.phone),
        whatsappOptIn: row.whatsapp_opt_in ?? false,
        emailOptIn: row.wants_partner_updates ?? false,
      };
    });
  }

  const rows = (
    await passDb.execute(
      sql`select id, full_name, phone, whatsapp_opt_in, marketing_consent from pass_guests order by full_name asc nulls last`,
    )
  ).rows as PassGuestRow[];

  return rows.map((row) => {
    const fullName = splitFullName(row.full_name);

    return {
      guestId: row.id,
      firstName: fullName.firstName,
      lastName: fullName.lastName,
      phoneNumber: row.phone,
      normalizedPhoneNumber: normalizePhoneNumber(row.phone),
      whatsappOptIn: row.whatsapp_opt_in ?? false,
      emailOptIn: row.marketing_consent ?? false,
    };
  });
}