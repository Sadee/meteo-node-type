import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp, type Db } from "./app.js";

const SECRET = "test-secret";

// Only query() is used, so a stub with a mocked query() stands in for the pg pool.
function stubDb(query = vi.fn()): Db {
  return { query } as unknown as Db;
}

function sessionCookie(res: request.Response): string {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith("session="));
  if (!cookie) throw new Error("no session cookie set");
  return cookie.split(";")[0];
}

describe("api", () => {
  it("GET /api/health", async () => {
    const app = createApp(stubDb(), SECRET);
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/items requires a session", async () => {
    const app = createApp(stubDb(), SECRET);
    const res = await request(app).get("/api/items");
    expect(res.status).toBe(401);
  });
});

describe("auth", () => {
  const user = { id: 1, name: "Ada", email: "ada@example.com" };

  it("register creates a user and starts a session usable on protected routes", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [user] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: "a", created_at: "2026-01-01" }] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: " ADA@example.com ", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(user);
    // Email is normalised and the password is stored hashed, never as plain text.
    const [, params] = query.mock.calls[0];
    expect(params[1]).toBe("ada@example.com");
    expect(params[2]).not.toBe("password123");
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);

    const items = await request(app).get("/api/items").set("Cookie", sessionCookie(res));
    expect(items.status).toBe(200);
  });

  it("register rejects a short password", async () => {
    const app = createApp(stubDb(), SECRET);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: "ada@example.com", password: "short" });
    expect(res.status).toBe(400);
  });

  it("register returns 409 for a duplicate email", async () => {
    const query = vi.fn().mockRejectedValue({ code: "23505" });
    const app = createApp(stubDb(query), SECRET);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: "ada@example.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("login succeeds with the right password and /me returns the user", async () => {
    const password_hash = bcrypt.hashSync("password123", 4);
    const query = vi.fn().mockResolvedValue({ rows: [{ ...user, password_hash }] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).post("/api/auth/login").send({ email: "ada@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);

    const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(res));
    expect(me.body).toEqual(user);
  });

  it("login rejects a wrong password and an unknown email the same way", async () => {
    const password_hash = bcrypt.hashSync("password123", 4);
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ ...user, password_hash }] })
      .mockResolvedValueOnce({ rows: [] });
    const app = createApp(stubDb(query), SECRET);

    const wrong = await request(app).post("/api/auth/login").send({ email: "ada@example.com", password: "nope-nope" });
    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "who@example.com", password: "password123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("rejects a session signed with a different secret", async () => {
    const other = createApp(stubDb(vi.fn().mockResolvedValue({ rows: [user] })), "other");
    const res = await request(other)
      .post("/api/auth/register")
      .send({ name: "Ada", email: "ada@example.com", password: "password123" });

    const app = createApp(stubDb(), SECRET);
    const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(res));
    expect(me.status).toBe(401);
  });
});
