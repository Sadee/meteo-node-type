import { vi } from "vitest";

type Reply = { status?: number; body?: unknown };
type Route = Reply | ((body: unknown) => Reply);

/**
 * Stubs the global fetch with canned API replies, keyed by "METHOD /api/path".
 * Unmatched requests get a 404. Returns the spy so tests can inspect calls.
 */
export function mockFetch(routes: Record<string, Route>) {
  const spy = vi.fn(async (url: string, init: RequestInit = {}) => {
    const route = routes[`${init.method ?? "GET"} ${url}`];
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const reply = typeof route === "function" ? route(body) : (route ?? { status: 404, body: { error: "Not found" } });
    const status = reply.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(reply.body ?? null), { status });
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

/** The parsed JSON body of the nth fetch call. */
export function sentBody(spy: ReturnType<typeof mockFetch>, call = 0) {
  return JSON.parse(spy.mock.calls[call][1]?.body as string);
}
