import { z } from "zod";

const urlSchema = z.string().url();

const whatsOnEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(120),
  venue: z.string().min(2).max(120),
  time: z.string().min(1).max(50),
  url: z.string().url().optional(),
});

export const whatsOnContentSchema = z.object({
  type: z.literal("whats_on_today"),
  date: z.string().min(1),
  events: z
    .array(whatsOnEventSchema)
    .length(3, "Exactly three events are required"),
});

export const venueFeatureContentSchema = z.object({
  type: z.literal("venue_feature"),
  venueName: z.string().min(2).max(120),
  description: z.string().min(10).max(500),
  offer: z.string().min(2).max(250),
  url: urlSchema,
});

export const featuredCafesContentSchema = z.object({
  type: z.literal("featured_cafes"),
  heroImage: z.string().min(1),
  link: urlSchema,
});

export const ahangamaGuideContentSchema = z.object({
  type: z.literal("ahangama_guide"),
  heroImage: z.string().min(1),
  guideLink: urlSchema,
});

export const wellnessPickContentSchema = z.object({
  type: z.literal("wellness_pick"),
  venueName: z.string().min(2).max(120),
  description: z.string().min(10).max(500),
  practicalDetail: z.string().min(2).max(250),
  url: urlSchema,
});

export const campaignContentSchema = z.discriminatedUnion("type", [
  whatsOnContentSchema,
  featuredCafesContentSchema,
  ahangamaGuideContentSchema,
  venueFeatureContentSchema,
  wellnessPickContentSchema,
]);
