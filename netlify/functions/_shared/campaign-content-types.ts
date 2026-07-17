export type WhatsOnEvent = {
  id: string;
  title: string;
  venue: string;
  time: string;
  url?: string;
};

export type CampaignContent =
  | {
      type: "whats_on_today";
      date: string;
      events: [WhatsOnEvent, WhatsOnEvent, WhatsOnEvent];
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
    };
