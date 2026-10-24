import { api } from "../../shared/api";
import type { User } from "./types";

export const userApi = {
  me: () => api<User>("/auth/me"),
  login: (body: { email: string; password: string }) => api<User>("/auth/login", { method: "POST", body }),
  register: (body: { name: string; email: string; password: string }) =>
    api<User>("/auth/register", { method: "POST", body }),
  logout: () => api<null>("/auth/logout", { method: "POST" }),
};
