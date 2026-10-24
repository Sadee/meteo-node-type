import { describe, expect, it } from "vitest";
import { mockFetch, sentBody } from "../test/mockFetch";
import { api, ApiError } from "./api";

describe("api", () => {
  it("prefixes /api and returns the parsed JSON", async () => {
    mockFetch({ "GET /api/sites": { body: [{ id: 1 }] } });
    await expect(api("/sites")).resolves.toEqual([{ id: 1 }]);
  });

  it("sends a JSON body with the right content type", async () => {
    const fetch = mockFetch({ "POST /api/sites": { status: 201, body: { id: 1 } } });
    await api("/sites", { method: "POST", body: { name: "Plant" } });

    expect(sentBody(fetch)).toEqual({ name: "Plant" });
    expect(fetch.mock.calls[0][1]?.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("returns null for 204 No Content", async () => {
    mockFetch({ "POST /api/auth/logout": { status: 204 } });
    await expect(api("/auth/logout", { method: "POST" })).resolves.toBeNull();
  });

  it("throws ApiError with the status and the server's error message", async () => {
    mockFetch({ "GET /api/sites": { status: 401, body: { error: "Not signed in" } } });

    const err = await api("/sites").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, message: "Not signed in" });
  });
});
