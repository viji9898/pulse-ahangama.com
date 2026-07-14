import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { conversations } from "../../db/schema/index.js";
import { db } from "./_shared/db.js";

type RequestBody = {
  conversationId?: string;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const body = (await request.json()) as RequestBody;

  if (!body.conversationId) {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 },
    );
  }

  const [conversation] = await db
    .update(conversations)
    .set({
      unreadCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, body.conversationId))
    .returning({
      id: conversations.id,
      unreadCount: conversations.unreadCount,
    });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    conversation,
  });
};

export const config: Config = {
  path: "/api/conversation/mark-read",
};
