import { Router, type Request } from "express";
import type { Db } from "./app.js";
import { requireRole, type AuthUser } from "./auth.js";
import { fetchCurrentWeather, WeatherUnavailableError } from "./weather.js";

export const SITE_STATUSES = ["planned", "active", "inactive", "closed"] as const;
type SiteStatus = (typeof SITE_STATUSES)[number];

type SiteInput = {
  name: string;
  description: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  status: SiteStatus;
};

// Each site comes with its managers. Managers only ever see sites they are assigned to ($1 = their id);
// directors pass null and see everything.
const SELECT_SITES = `
  SELECT s.id, s.name, s.description, s.city, s.country, s.latitude, s.longitude, s.status,
         s.created_at, s.updated_at,
         COALESCE(
           json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email) ORDER BY u.name)
             FILTER (WHERE u.id IS NOT NULL),
           '[]'
         ) AS managers
  FROM sites s
  LEFT JOIN site_managers sm ON sm.site_id = s.id
  LEFT JOIN users u ON u.id = sm.user_id
  WHERE ($1::int IS NULL OR EXISTS (SELECT 1 FROM site_managers WHERE site_id = s.id AND user_id = $1))`;

function viewerFilter(user: AuthUser | undefined) {
  return user?.role === "director" ? null : (user?.id ?? -1);
}

function siteId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function coordinate(value: unknown, limit: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export function parseSite(body: unknown): { site: SiteInput } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = text(b.name);
  const city = text(b.city);
  const country = text(b.country);
  const latitude = coordinate(b.latitude, 90);
  const longitude = coordinate(b.longitude, 180);
  const status = b.status === undefined ? "planned" : b.status;

  if (!name) return { error: "Name is required" };
  if (!city) return { error: "City is required" };
  if (!country) return { error: "Country is required" };
  if (latitude === null) return { error: "Latitude must be a number between -90 and 90" };
  if (longitude === null) return { error: "Longitude must be a number between -180 and 180" };
  if (!SITE_STATUSES.includes(status as SiteStatus)) {
    return { error: `Status must be one of: ${SITE_STATUSES.join(", ")}` };
  }
  return {
    site: { name, description: text(b.description), city, country, latitude, longitude, status: status as SiteStatus },
  };
}

// Mounted at /api/sites behind requireAuth. Reads are open to every signed-in user (scoped to their
// assignments for managers); everything that changes data is for directors only.
export function sitesRouter(db: Db) {
  const router = Router();
  const directorOnly = requireRole("director");

  async function findSite(id: number, viewer: number | null) {
    const { rows } = await db.query(`${SELECT_SITES} AND s.id = $2 GROUP BY s.id`, [viewer, id]);
    return rows[0];
  }

  router.get("/", async (req, res, next) => {
    try {
      const { rows } = await db.query(`${SELECT_SITES} GROUP BY s.id ORDER BY s.name`, [viewerFilter(req.user)]);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    const id = siteId(req);
    try {
      const site = id && (await findSite(id, viewerFilter(req.user)));
      if (!site) {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      res.json(site);
    } catch (err) {
      next(err);
    }
  });

  // Current weather at the site's coordinates, for anyone who can see the site.
  router.get("/:id/weather", async (req, res, next) => {
    const id = siteId(req);
    try {
      const site = id && (await findSite(id, viewerFilter(req.user)));
      if (!site) {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      res.json(await fetchCurrentWeather(site.latitude, site.longitude));
    } catch (err) {
      if (err instanceof WeatherUnavailableError) {
        console.error(err.message);
        res.status(502).json({ error: "Weather is unavailable right now" });
        return;
      }
      next(err);
    }
  });

  router.post("/", directorOnly, async (req, res, next) => {
    const parsed = parseSite(req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const s = parsed.site;
    try {
      const { rows } = await db.query(
        `INSERT INTO sites (name, description, city, country, latitude, longitude, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [s.name, s.description, s.city, s.country, s.latitude, s.longitude, s.status],
      );
      res.status(201).json(await findSite(rows[0].id, null));
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", directorOnly, async (req, res, next) => {
    const id = siteId(req);
    const parsed = parseSite(req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const s = parsed.site;
    try {
      const { rowCount } = await db.query(
        `UPDATE sites SET name = $2, description = $3, city = $4, country = $5, latitude = $6, longitude = $7,
                          status = $8, updated_at = now()
         WHERE id = $1`,
        [id, s.name, s.description, s.city, s.country, s.latitude, s.longitude, s.status],
      );
      if (!rowCount) {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      res.json(await findSite(id!, null));
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", directorOnly, async (req, res, next) => {
    try {
      const { rowCount } = await db.query("DELETE FROM sites WHERE id = $1", [siteId(req)]);
      if (!rowCount) {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Replaces the site's whole set of managers with the given user ids.
  router.put("/:id/managers", directorOnly, async (req, res, next) => {
    const id = siteId(req);
    if (!id) {
      res.status(404).json({ error: "Site not found" });
      return;
    }
    const raw: unknown = req.body?.userIds;
    if (!Array.isArray(raw) || !raw.every((v) => Number.isInteger(v) && v > 0)) {
      res.status(400).json({ error: "userIds must be a list of user ids" });
      return;
    }
    const userIds = [...new Set(raw as number[])];
    try {
      const managers = await db.query("SELECT count(*)::int AS n FROM users WHERE id = ANY($1) AND role = 'manager'", [
        userIds,
      ]);
      if (managers.rows[0].n !== userIds.length) {
        res.status(400).json({ error: "Only managers can be assigned to a site" });
        return;
      }
      // One statement, so the removal and the additions apply together.
      await db.query(
        `WITH removed AS (
           DELETE FROM site_managers WHERE site_id = $1 AND NOT (user_id = ANY($2))
         )
         INSERT INTO site_managers (site_id, user_id)
         SELECT $1, unnest($2::int[])
         ON CONFLICT DO NOTHING`,
        [id, userIds],
      );
      const site = await findSite(id, null);
      if (!site) {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      res.json(site);
    } catch (err) {
      // Foreign key violation: the site doesn't exist.
      if ((err as { code?: string }).code === "23503") {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      next(err);
    }
  });

  return router;
}
