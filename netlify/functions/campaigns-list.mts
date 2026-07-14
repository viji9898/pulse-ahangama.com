import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { campaigns, venues } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  try {
    const results = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        channel: campaigns.channel,
        status: campaigns.status,
        templateName: campaigns.templateName,
        recipientCount: campaigns.recipientCount,
        estimatedMetaCostUsd: campaigns.estimatedMetaCostUsd,
        venuePriceUsd: campaigns.venuePriceUsd,
        scheduledAt: campaigns.scheduledAt,
        createdAt: campaigns.createdAt,
        venueId: campaigns.venueId,
        venueName: venues.name,
      })
      .from(campaigns)
      .leftJoin(venues, eq(campaigns.venueId, venues.id))
      .orderBy(desc(campaigns.createdAt))
      .limit(250);

    return Response.json({
      campaigns: results,
    });
  } catch (error) {
    console.error("Campaign list failed", error);

    return Response.json(
      {
        error: "Unable to load campaigns",
      },
      {
        status: 500,
      },
    );
  }
};

export const config: Config = {
  path: "/api/campaigns",
};
