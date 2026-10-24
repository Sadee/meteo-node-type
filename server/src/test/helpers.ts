import jwt from "jsonwebtoken";
import type request from "supertest";
import { vi } from "vitest";
import type { Db } from "../app.js";
import type { AuthUser } from "../auth.js";

export const SECRET = "test-secret";

export const director: AuthUser = { id: 1, name: "Dana", email: "dana@example.com", role: "director" };
export const manager: AuthUser = { id: 2, name: "Mia", email: "mia@example.com", role: "manager" };

// Only query() is used, so a stub with a mocked query() stands in for the pg pool.
export function stubDb(query = vi.fn()): Db {
  return { query } as unknown as Db;
}

// The cookie is Secure, so supertest's cookie jar won't send it over http; tests copy it by hand.
export function sessionCookie(res: request.Response): string {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith("session="));
  if (!cookie) throw new Error("no session cookie set");
  return cookie.split(";")[0];
}

// A session cookie for the given user, without going through login.
export function cookieFor(user: AuthUser, claims: object = { role: user.role }): string {
  const token = jwt.sign({ name: user.name, email: user.email, ...claims }, SECRET, { subject: String(user.id) });
  return `session=${token}`;
}
