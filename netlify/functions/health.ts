import type { Config } from "@netlify/functions";

export default async () => {
  return Response.json({
    ok: true,
    service: "ahangama-pulse",
    timestamp: new Date().toISOString(),
  });
};

export const config: Config = {
  path: "/api/health",
};
