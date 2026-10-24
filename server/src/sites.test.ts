import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { parseSite } from "./sites.js";
import { SECRET, cookieFor, director, manager, stubDb } from "./test/helpers.js";

const stuttgart = {
  name: "Stuttgart Assembly",
  description: "Main plant",
  city: "Stuttgart",
  country: "Germany",
  latitude: 48.7758,
  longitude: 9.1829,
  status: "active",
};
const site = { id: 7, ...stuttgart, managers: [] };

describe("parseSite", () => {
  it("trims text, defaults status to planned and description to empty", () => {
    expect(parseSite({ ...stuttgart, name: "  A  ", description: undefined, status: undefined })).toEqual({
      site: { ...stuttgart, name: "A", description: "", status: "planned" },
    });
  });

  it.each([
    [{ name: "" }, "Name is required"],
    [{ city: " " }, "City is required"],
    [{ country: undefined }, "Country is required"],
    [{ latitude: 91 }, "Latitude must be a number between -90 and 90"],
    [{ latitude: "48.7" }, "Latitude must be a number between -90 and 90"],
    [{ longitude: -180.5 }, "Longitude must be a number between -180 and 180"],
    [{ status: "open" }, "Status must be one of: planned, active, inactive, closed"],
  ])("rejects %o", (change, error) => {
    expect(parseSite({ ...stuttgart, ...change })).toEqual({ error });
  });
});

describe("GET /api/sites", () => {
  it("lists every site for a director", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [site] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).get("/api/sites").set("Cookie", cookieFor(director));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([site]);
    expect(query.mock.calls[0][1]).toEqual([null]);
  });

  it("scopes the list to a manager's own sites", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const app = createApp(stubDb(query), SECRET);

    await request(app).get("/api/sites").set("Cookie", cookieFor(manager));
    expect(query.mock.calls[0][1]).toEqual([manager.id]);
  });

  it("returns 404 for a site a manager isn't assigned to", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).get("/api/sites/7").set("Cookie", cookieFor(manager));
    expect(res.status).toBe(404);
    expect(query.mock.calls[0][1]).toEqual([manager.id, 7]);
  });

  it("returns 404 for an invalid id without querying", async () => {
    const query = vi.fn();
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).get("/api/sites/abc").set("Cookie", cookieFor(director));
    expect(res.status).toBe(404);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("changing sites", () => {
  it.each([
    ["post", "/api/sites"],
    ["put", "/api/sites/7"],
    ["delete", "/api/sites/7"],
    ["put", "/api/sites/7/managers"],
  ] as const)("%s %s is forbidden for managers", async (method, path) => {
    const query = vi.fn();
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)[method](path).set("Cookie", cookieFor(manager)).send(stuttgart);
    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it("creates a site", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [site] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).post("/api/sites").set("Cookie", cookieFor(director)).send(stuttgart);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(site);
    expect(query.mock.calls[0][1]).toEqual(Object.values(stuttgart));
  });

  it("rejects an invalid site with 400", async () => {
    const query = vi.fn();
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .post("/api/sites")
      .set("Cookie", cookieFor(director))
      .send({ ...stuttgart, latitude: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Latitude/);
    expect(query).not.toHaveBeenCalled();
  });

  it("updates a site", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [site] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).put("/api/sites/7").set("Cookie", cookieFor(director)).send(stuttgart);
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][1]).toEqual([7, ...Object.values(stuttgart)]);
  });

  it("returns 404 when updating or deleting a missing site", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0 });
    const app = createApp(stubDb(query), SECRET);
    const cookie = cookieFor(director);

    expect((await request(app).put("/api/sites/99").set("Cookie", cookie).send(stuttgart)).status).toBe(404);
    expect((await request(app).delete("/api/sites/99").set("Cookie", cookie)).status).toBe(404);
  });

  it("deletes a site", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app).delete("/api/sites/7").set("Cookie", cookieFor(director));
    expect(res.status).toBe(204);
    expect(query.mock.calls[0][1]).toEqual([7]);
  });
});

describe("PUT /api/sites/:id/managers", () => {
  it("replaces the site's managers", async () => {
    const withMia = { ...site, managers: [{ id: 2, name: "Mia", email: "mia@example.com" }] };
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [withMia] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .put("/api/sites/7/managers")
      .set("Cookie", cookieFor(director))
      .send({ userIds: [2, 2] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(withMia);
    // Duplicates are dropped before checking that every id is a manager.
    expect(query.mock.calls[0][1]).toEqual([[2]]);
    expect(query.mock.calls[1][1]).toEqual([7, [2]]);
  });

  it("accepts an empty list to unassign everyone", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [site] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .put("/api/sites/7/managers")
      .set("Cookie", cookieFor(director))
      .send({ userIds: [] });
    expect(res.status).toBe(200);
  });

  it("rejects ids that aren't managers", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ n: 1 }] });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .put("/api/sites/7/managers")
      .set("Cookie", cookieFor(director))
      .send({ userIds: [2, 1] });
    expect(res.status).toBe(400);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rejects a body without a list of ids", async () => {
    const app = createApp(stubDb(), SECRET);
    const res = await request(app)
      .put("/api/sites/7/managers")
      .set("Cookie", cookieFor(director))
      .send({ userIds: ["2"] });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing site", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })
      .mockRejectedValueOnce({ code: "23503" });
    const app = createApp(stubDb(query), SECRET);

    const res = await request(app)
      .put("/api/sites/99/managers")
      .set("Cookie", cookieFor(director))
      .send({ userIds: [2] });
    expect(res.status).toBe(404);
  });
});
