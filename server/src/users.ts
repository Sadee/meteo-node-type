import { Router } from "express";
import type { Db } from "./app.js";
import { EMAIL_RE, hashPassword, passwordError } from "./auth.js";

// Mounted behind requireRole("director").
export function managersRouter(db: Db) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.email, u.created_at, count(sm.site_id)::int AS site_count
         FROM users u
         LEFT JOIN site_managers sm ON sm.user_id = u.id
         WHERE u.role = 'manager'
         GROUP BY u.id
         ORDER BY u.name`,
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }
    const invalidPassword = passwordError(password);
    if (invalidPassword) {
      res.status(400).json({ error: invalidPassword });
      return;
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'manager')
         RETURNING id, name, email, created_at, 0 AS site_count`,
        [name, email, await hashPassword(password)],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      next(err);
    }
  });

  return router;
}
