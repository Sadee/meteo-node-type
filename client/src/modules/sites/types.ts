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

// A value with the unit Open-Meteo reported it in; null when Open-Meteo left it out.
export type Reading = { value: number; unit: string } | null;

// Current conditions at a site, from Open-Meteo via the API.
export type Weather = {
  temperature: Reading;
  humidity: Reading;
  precipitation: Reading;
  rain: Reading;
  snowfall: Reading;
  isDay: boolean | null;
};
