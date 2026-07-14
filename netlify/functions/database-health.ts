import type { Config } from "@netlify/functions";
import { sql } from "drizzle-orm";
import { db } from "./_shared/db.js";

export default async () => {
  try {
    const result = await db.execute(sql`
      select now() as database_time
    `);

    return Response.json({
      ok: true,
      database: "connected",
      result,
    });
  } catch (error) {
    console.error("Database health check failed", error);

    return Response.json(
      {
        ok: false,
        error: "Database connection failed",
      },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/database-health",
};
