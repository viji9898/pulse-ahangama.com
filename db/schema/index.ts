import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
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

export const campaignTypeEnum = pgEnum("campaign_type", [
  "whats_on_today",
  "featured_cafes",
  "venue_feature",
  "wellness_pick",
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

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 200 }).notNull(),
    channel: messageChannelEnum("channel").notNull(),
    status: campaignStatusEnum("status").default("draft").notNull(),
    campaignType: campaignTypeEnum("campaign_type").notNull(),

    venueId: uuid("venue_id").references(() => venues.id),

    templateName: varchar("template_name", {
      length: 200,
    }),

    templateLanguage: varchar("template_language", {
      length: 20,
    }).default("en_US"),

    contentPayload: jsonb("content_payload")
      .$type<
        | {
            type: "whats_on_today";
            date: string;
            events: [
              {
                id: string;
                title: string;
                venue: string;
                time: string;
                url?: string;
              },
              {
                id: string;
                title: string;
                venue: string;
                time: string;
                url?: string;
              },
              {
                id: string;
                title: string;
                venue: string;
                time: string;
                url?: string;
              },
            ];
          }
        | {
            type: "featured_cafes";
            heroImage: string;
            link: string;
          }
        | {
            type: "venue_feature";
            venueName: string;
            description: string;
            offer: string;
            url: string;
          }
        | {
            type: "wellness_pick";
            venueName: string;
            description: string;
            practicalDetail: string;
            url: string;
          }
      >()
      .notNull(),

    templateVariables: jsonb("template_variables")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),

    audienceDefinition: jsonb("audience_definition")
      .$type<{
        search?: string;
        interests?: string[];
        accommodationName?: string;
        currentlyStaying?: boolean;
        whatsappOptIn?: boolean;
        excludeRecentlyMessagedHours?: number;
      }>()
      .default({}),

    recipientCount: integer("recipient_count").default(0).notNull(),

    estimatedMetaCostUsd: numeric("estimated_meta_cost_usd", {
      precision: 12,
      scale: 4,
    })
      .default("0")
      .notNull(),

    venuePriceUsd: numeric("venue_price_usd", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),

    sentCount: integer("sent_count").default(0).notNull(),
    deliveredCount: integer("delivered_count").default(0).notNull(),
    readCount: integer("read_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),

    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
    }),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    lastTestSentAt: timestamp("last_test_sent_at", {
      withTimezone: true,
    }),

    lastTestRunId: uuid("last_test_run_id"),

    testApprovedAt: timestamp("test_approved_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("campaigns_status_idx").on(table.status),
    index("campaigns_scheduled_at_idx").on(table.scheduledAt),
    index("campaigns_venue_idx").on(table.venueId),
  ],
);

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

export const guestInterests = pgTable(
  "guest_interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestId: uuid("guest_id")
      .references(() => guests.id, { onDelete: "cascade" })
      .notNull(),
    interest: varchar("interest", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("guest_interest_unique").on(table.guestId, table.interest),
    index("guest_interests_guest_idx").on(table.guestId),
  ],
);

export const guestStays = pgTable(
  "guest_stays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestId: uuid("guest_id")
      .references(() => guests.id, { onDelete: "cascade" })
      .notNull(),
    accommodationName: varchar("accommodation_name", {
      length: 200,
    }),
    arrivalDate: timestamp("arrival_date", {
      withTimezone: true,
    }),
    departureDate: timestamp("departure_date", {
      withTimezone: true,
    }),
    source: varchar("source", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("guest_stays_guest_idx").on(table.guestId),
    index("guest_stays_dates_idx").on(table.arrivalDate, table.departureDate),
  ],
);

export const guestNotes = pgTable(
  "guest_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestId: uuid("guest_id")
      .references(() => guests.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("guest_notes_guest_idx").on(table.guestId)],
);

export const testAudiences = pgTable("test_audiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const testAudienceMembers = pgTable(
  "test_audience_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    audienceId: uuid("audience_id")
      .references(() => testAudiences.id, {
        onDelete: "cascade",
      })
      .notNull(),

    guestId: uuid("guest_id")
      .references(() => guests.id, {
        onDelete: "cascade",
      })
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("test_audience_member_unique").on(
      table.audienceId,
      table.guestId,
    ),
    index("test_audience_members_audience_idx").on(table.audienceId),
  ],
);

export const campaignRecipientStatusEnum = pgEnum("campaign_recipient_status", [
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "skipped",
]);

export const campaignTestStatusEnum = pgEnum("campaign_test_status", [
  "queued",
  "sending",
  "completed",
  "failed",
]);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, {
        onDelete: "cascade",
      })
      .notNull(),

    guestId: uuid("guest_id")
      .references(() => guests.id, {
        onDelete: "cascade",
      })
      .notNull(),

    phoneNumber: varchar("phone_number", {
      length: 40,
    }).notNull(),

    status: campaignRecipientStatusEnum("status").default("pending").notNull(),

    providerMessageId: varchar("provider_message_id", {
      length: 255,
    }),

    templateVariables: jsonb("template_variables")
      .$type<Record<string, string>>()
      .default({}),

    estimatedCostUsd: numeric("estimated_cost_usd", {
      precision: 12,
      scale: 4,
    })
      .default("0")
      .notNull(),

    errorCode: varchar("error_code", {
      length: 100,
    }),

    errorMessage: text("error_message"),

    sentAt: timestamp("sent_at", {
      withTimezone: true,
    }),

    deliveredAt: timestamp("delivered_at", {
      withTimezone: true,
    }),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    failedAt: timestamp("failed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("campaign_recipient_unique").on(
      table.campaignId,
      table.guestId,
    ),
    index("campaign_recipients_campaign_idx").on(table.campaignId),
    index("campaign_recipients_status_idx").on(table.status),
    uniqueIndex("campaign_recipient_provider_message_unique").on(
      table.providerMessageId,
    ),
  ],
);

export const campaignTestRuns = pgTable(
  "campaign_test_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, {
        onDelete: "cascade",
      })
      .notNull(),

    audienceId: uuid("audience_id")
      .references(() => testAudiences.id)
      .notNull(),

    status: campaignTestStatusEnum("status").default("queued").notNull(),

    recipientCount: integer("recipient_count").default(0).notNull(),
    sentCount: integer("sent_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("campaign_test_runs_campaign_idx").on(table.campaignId)],
);

export const campaignTestRecipients = pgTable(
  "campaign_test_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    testRunId: uuid("test_run_id")
      .references(() => campaignTestRuns.id, {
        onDelete: "cascade",
      })
      .notNull(),

    guestId: uuid("guest_id").references(() => guests.id).notNull(),

    phoneNumber: varchar("phone_number", {
      length: 40,
    }).notNull(),

    status: campaignRecipientStatusEnum("status").default("pending").notNull(),

    providerMessageId: varchar("provider_message_id", {
      length: 255,
    }),

    errorMessage: text("error_message"),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("campaign_test_recipient_unique").on(
      table.testRunId,
      table.guestId,
    ),
    uniqueIndex("campaign_test_provider_message_unique").on(
      table.providerMessageId,
    ),
  ],
);
