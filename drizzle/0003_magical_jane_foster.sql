CREATE TABLE "guest_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"interest" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"accommodation_name" varchar(200),
	"arrival_date" timestamp with time zone,
	"departure_date" timestamp with time zone,
	"source" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_interests" ADD CONSTRAINT "guest_interests_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_notes" ADD CONSTRAINT "guest_notes_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_stays" ADD CONSTRAINT "guest_stays_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_interest_unique" ON "guest_interests" USING btree ("guest_id","interest");--> statement-breakpoint
CREATE INDEX "guest_interests_guest_idx" ON "guest_interests" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_notes_guest_idx" ON "guest_notes" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_stays_guest_idx" ON "guest_stays" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_stays_dates_idx" ON "guest_stays" USING btree ("arrival_date","departure_date");