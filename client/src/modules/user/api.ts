import { api } from "../../shared/api";
import type { Manager, User } from "./types";

export const userApi = {
  me: () => api<User>("/auth/me"),
  login: (body: { email: string; password: string }) => api<User>("/auth/login", { method: "POST", body }),
  logout: () => api<null>("/auth/logout", { method: "POST" }),
};

export const managersApi = {
  list: () => api<Manager[]>("/managers"),
  create: (body: { name: string; email: string; password: string }) =>
    api<Manager>("/managers", { method: "POST", body }),
};
