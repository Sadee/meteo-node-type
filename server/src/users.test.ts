import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { SECRET, cookieFor, director, manager, stubDb } from "./test/helpers.js";

const mia = { id: 2, name: "Mia", email: "mia@example.com", created_at: "2026-01-01", site_count: 0 };

describe("/api/managers", () => {
  it("is for directors only", async () => {
    const query = vi.fn();
    const app = createApp(stubDb(query), SECRET);

    expect((await request(app).get("/api/managers").set("Cookie", cookieFor(manager))).status).toBe(403);
    expect((await request(app).post("/api/managers").set("Cookie", cookieFor(manager))).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it("lists managers", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [mia] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).get("/api/managers").set("Cookie", cookieFor(director));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([mia]);
  });

  it("creates a manager with a normalised email and a hashed password", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [mia] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .post("/api/managers")
      .set("Cookie", cookieFor(director))
      .send({ name: " Mia ", email: " MIA@example.com ", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(mia);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/'manager'/);
    expect(params.slice(0, 2)).toEqual(["Mia", "mia@example.com"]);
    expect(bcrypt.compareSync("password123", params[2])).toBe(true);
  });

  it.each([
    [{ name: "" }, "Name is required"],
    [{ email: "not-an-email" }, "A valid email is required"],
    [{ password: "short" }, "Password must be 8–72 characters"],
  ])("rejects %o", async (change, error) => {
    const app = createApp(stubDb(), SECRET);
    const res = await request(app)
      .post("/api/managers")
      .set("Cookie", cookieFor(director))
      .send({ name: "Mia", email: "mia@example.com", password: "password123", ...change });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(error);
  });

  it("returns 409 for a duplicate email", async () => {
    const query = vi.fn().mockRejectedValue({ code: "23505" });
    const app = createApp(stubDb(query), SECRET);
    const res = await request(app)
      .post("/api/managers")
      .set("Cookie", cookieFor(director))
      .send({ name: "Mia", email: "mia@example.com", password: "password123" });
    expect(res.status).toBe(409);
  });
});
