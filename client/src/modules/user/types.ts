export type Role = "director" | "manager";
export type User = { id: number; name: string; email: string; role: Role };
export type Manager = { id: number; name: string; email: string; created_at: string; site_count: number };
