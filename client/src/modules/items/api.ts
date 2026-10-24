import { api } from "../../shared/api";
import type { Item } from "./types";

export const itemsApi = {
  list: () => api<Item[]>("/items"),
  create: (body: { name: string }) => api<Item>("/items", { method: "POST", body }),
};
