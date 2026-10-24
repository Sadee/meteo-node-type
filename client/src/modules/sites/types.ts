export const SITE_STATUSES = ["planned", "active", "inactive", "closed"] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export type SiteManager = { id: number; name: string; email: string };

export type Site = {
  id: number;
  name: string;
  description: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  status: SiteStatus;
  created_at: string;
  updated_at: string;
  managers: SiteManager[];
};

export type SiteInput = Pick<Site, "name" | "description" | "city" | "country" | "latitude" | "longitude" | "status">;

// Current conditions at a site, from Open-Meteo via the API.
export type Weather = {
  temperature: number; // °C
};
