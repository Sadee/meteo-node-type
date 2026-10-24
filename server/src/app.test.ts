import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { SECRET, cookieFor, director, sessionCookie, stubDb } from "./test/helpers.js";

describe("api", () => {
  it("GET /api/health", async () => {
    const app = createApp(stubDb(), SECRET);
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("protected routes require a session", async () => {
    const app = createApp(stubDb(), SECRET);
    expect((await request(app).get("/api/sites")).status).toBe(401);
    expect((await request(app).get("/api/managers")).status).toBe(401);
  });
});

describe("auth", () => {
  const user = director;

  it("registration is closed", async () => {
    const query = vi.fn();
    const app = createApp(stubDb(query), SECRET);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: "ada@example.com", password: "password123" });
    // No such route any more; like any unknown /api path it falls through to requireAuth.
    expect(res.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("login succeeds with the right password and /me returns the user with their role", async () => {
    const password_hash = bcrypt.hashSync("password123", 4);
    const query = vi.fn().mockResolvedValue({ rows: [{ ...user, password_hash }] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: " DANA@example.com ", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
    expect(query.mock.calls[0][1]).toEqual(["dana@example.com"]);
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);

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

    const wrong = await request(app).post("/api/auth/login").send({ email: "dana@example.com", password: "nope-nope" });
    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "who@example.com", password: "password123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("rejects a session signed with a different secret", async () => {
    const password_hash = bcrypt.hashSync("password123", 4);
    const other = createApp(stubDb(vi.fn().mockResolvedValue({ rows: [{ ...user, password_hash }] })), "other");
    const res = await request(other)
      .post("/api/auth/login")
      .send({ email: "dana@example.com", password: "password123" });

    const app = createApp(stubDb(), SECRET);
    const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(res));
    expect(me.status).toBe(401);
  });

  it("rejects a session from before roles existed", async () => {
    const app = createApp(stubDb(), SECRET);
    const me = await request(app).get("/api/auth/me").set("Cookie", cookieFor(user, {}));
    expect(me.status).toBe(401);
  });
});
