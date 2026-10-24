import cookieParser from "cookie-parser";
import express from "express";
import type { Pool } from "pg";
import { authRouter, requireAuth } from "./auth.js";

export type Db = Pick<Pool, "query">;

// Takes the pool as a parameter so tests can pass a stub instead of a real database.
export function createApp(db: Db, jwtSecret: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter(db, jwtSecret));

  // Everything registered below requires a signed-in user.
  app.use("/api", requireAuth(jwtSecret));

  app.get("/api/items", async (_req, res, next) => {
    try {
      const { rows } = await db.query("SELECT id, name, created_at FROM items ORDER BY id");
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/items", async (req, res, next) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      const { rows } = await db.query("INSERT INTO items (name) VALUES ($1) RETURNING id, name, created_at", [name]);
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  return app;
}
