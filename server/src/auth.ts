import bcrypt from "bcryptjs";
import { Router, type CookieOptions, type RequestHandler, type Response } from "express";
import jwt from "jsonwebtoken";
import type { Db } from "./app.js";

export type AuthUser = { id: number; name: string; email: string };

declare global {
  // Declaration merging onto Express's global namespace is how req.user gets typed.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const BCRYPT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

function startSession(res: Response, user: AuthUser, secret: string) {
  const token = jwt.sign({ name: user.name, email: user.email }, secret, {
    subject: String(user.id),
    expiresIn: SESSION_TTL_SECONDS,
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_SECONDS * 1000 });
}

export function requireAuth(secret: string): RequestHandler {
  return (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string") {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      req.user = { id: Number(payload.sub), name: payload.name, email: payload.email };
      next();
    } catch {
      res.clearCookie(SESSION_COOKIE, cookieOptions);
      res.status(401).json({ error: "Session expired" });
    }
  };
}

export function authRouter(db: Db, secret: string) {
  const router = Router();

  router.post("/register", async (req, res, next) => {
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
    // bcrypt ignores anything past 72 bytes.
    if (password.length < 8 || password.length > 72) {
      res.status(400).json({ error: "Password must be 8–72 characters" });
      return;
    }

    try {
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { rows } = await db.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
        [name, email, hash],
      );
      const user: AuthUser = rows[0];
      startSession(res, user, secret);
      res.status(201).json(user);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      next(err);
    }
  });

  router.post("/login", async (req, res, next) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    try {
      const { rows } = await db.query("SELECT id, name, email, password_hash FROM users WHERE email = $1", [email]);
      const row = rows[0];
      const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
      if (!row || !ok) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const user: AuthUser = { id: row.id, name: row.name, email: row.email };
      startSession(res, user, secret);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get("/me", requireAuth(secret), (req, res) => {
    res.json(req.user);
  });

  return router;
}
