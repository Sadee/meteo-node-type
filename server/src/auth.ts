import bcrypt from "bcryptjs";
import { Router, type CookieOptions, type RequestHandler, type Response } from "express";
import jwt from "jsonwebtoken";
import type { Db } from "./app.js";

export const ROLES = ["director", "manager"] as const;
export type Role = (typeof ROLES)[number];
export type AuthUser = { id: number; name: string; email: string; role: Role };

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
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

function startSession(res: Response, user: AuthUser, secret: string) {
  const token = jwt.sign({ name: user.name, email: user.email, role: user.role }, secret, {
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
      // Sessions issued before roles existed carry no role; make them sign in again.
      if (!ROLES.includes(payload.role)) throw new Error("session has no role");
      req.user = { id: Number(payload.sub), name: payload.name, email: payload.email, role: payload.role };
      next();
    } catch {
      res.clearCookie(SESSION_COOKIE, cookieOptions);
      res.status(401).json({ error: "Session expired" });
    }
  };
}

// Use after requireAuth.
export function requireRole(role: Role): RequestHandler {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: "You don't have permission to do that" });
      return;
    }
    next();
  };
}

// bcrypt ignores anything past 72 bytes.
export function passwordError(password: string): string | null {
  return password.length < 8 || password.length > 72 ? "Password must be 8–72 characters" : null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Registration is closed: directors create manager accounts (see users.ts).
export function authRouter(db: Db, secret: string) {
  const router = Router();

  router.post("/login", async (req, res, next) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    try {
      const { rows } = await db.query("SELECT id, name, email, role, password_hash FROM users WHERE email = $1", [
        email,
      ]);
      const row = rows[0];
      const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
      if (!row || !ok) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const user: AuthUser = { id: row.id, name: row.name, email: row.email, role: row.role };
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
