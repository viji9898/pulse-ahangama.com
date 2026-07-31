import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL_AHANGAMA_PASS) {
  throw new Error("DATABASE_URL_AHANGAMA_PASS is not configured");
}

export const passDb = drizzle(process.env.DATABASE_URL_AHANGAMA_PASS);