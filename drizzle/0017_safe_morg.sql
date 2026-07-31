CREATE TYPE "public"."audience_kind" AS ENUM('test', 'live');--> statement-breakpoint
ALTER TABLE "test_audiences" ADD COLUMN "kind" "audience_kind" DEFAULT 'test' NOT NULL;--> statement-breakpoint
CREATE INDEX "test_audiences_kind_idx" ON "test_audiences" USING btree ("kind");