import { api } from "../../shared/api";
import type { Site, SiteInput, SiteManager } from "./types";

export const sitesApi = {
  list: () => api<Site[]>("/sites"),
  get: (id: number) => api<Site>(`/sites/${id}`),
  create: (body: SiteInput) => api<Site>("/sites", { method: "POST", body }),
  update: (id: number, body: SiteInput) => api<Site>(`/sites/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<null>(`/sites/${id}`, { method: "DELETE" }),
  setManagers: (id: number, userIds: number[]) =>
    api<Site>(`/sites/${id}/managers`, { method: "PUT", body: { userIds } }),
  // The managers that can be assigned (directors only).
  managers: () => api<SiteManager[]>("/managers"),
};
