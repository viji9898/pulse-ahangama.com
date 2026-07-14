import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const messageChannelEnum = pgEnum("message_channel", [
  "whatsapp",
  "email",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "cancelled",
]);

export const guests = pgTable(
  "guests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),
    email: varchar("email", { length: 320 }),
    phoneNumber: varchar("phone_number", { length: 40 }),
    normalizedPhoneNumber: varchar("normalized_phone_number", {
      length: 40,
    }),
    countryCode: varchar("country_code", { length: 2 }),
    whatsappOptIn: boolean("whatsapp_opt_in").default(false).notNull(),
    emailOptIn: boolean("email_opt_in").default(false).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("guests_normalized_phone_unique").on(
      table.normalizedPhoneNumber,
    ),
    index("guests_email_idx").on(table.email),
  ],
);

export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  channel: messageChannelEnum("channel").notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  venueId: uuid("venue_id").references(() => venues.id),
  templateName: varchar("template_name", { length: 200 }),
  audienceDefinition: jsonb("audience_definition")
    .$type<Record<string, unknown>>()
    .default({}),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestId: uuid("guest_id")
      .references(() => guests.id)
      .notNull(),
    channel: messageChannelEnum("channel").notNull(),

    unreadCount: integer("unread_count").default(0).notNull(),
    assignedTo: varchar("assigned_to", { length: 255 }),
    status: varchar("status", { length: 30 }).default("open").notNull(),

    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", {
      withTimezone: true,
    }),

    serviceWindowEndsAt: timestamp("service_window_ends_at", {
      withTimezone: true,
    }),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversations_guest_idx").on(table.guestId),
    index("conversations_last_message_idx").on(table.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    guestId: uuid("guest_id")
      .references(() => guests.id)
      .notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    channel: messageChannelEnum("channel").notNull(),
    direction: messageDirectionEnum("direction").notNull(),
    status: messageStatusEnum("status").default("queued").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    messageType: varchar("message_type", { length: 50 }).notNull(),
    body: text("body"),
    providerPayload: jsonb("provider_payload")
      .$type<Record<string, unknown>>()
      .default({}),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("messages_provider_id_unique").on(table.providerMessageId),
    index("messages_conversation_idx").on(table.conversationId),
    index("messages_guest_idx").on(table.guestId),
    index("messages_campaign_idx").on(table.campaignId),
  ],
);

export const whatsappWebhookEvents = pgTable(
  "whatsapp_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    phoneNumberId: varchar("phone_number_id", { length: 100 }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processed: boolean("processed").default(false).notNull(),
    processingError: text("processing_error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("whatsapp_webhook_provider_message_idx").on(table.providerMessageId),
    index("whatsapp_webhook_received_idx").on(table.receivedAt),
  ],
);
