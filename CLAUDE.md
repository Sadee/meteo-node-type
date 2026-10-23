# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Demo full-stack TypeScript app: Express API (`server/`), React + Vite frontend (`client/`), PostgreSQL. Everything runs locally via Docker Compose. `server/` and `client/` are independent npm packages (no workspace root `package.json`), so run npm commands from inside each directory.

## Commands

Full stack (from repo root):
- `docker compose up --build` — start the stack, then open https://meteo-node-type.test (requires the external `caddy-proxy` stack to be running; see below).
- `docker compose down` — stop; add `-v` to wipe the database volume (needed to re-run `db/init.sql`).
- Host ports are deliberately non-default because many other local sites run on this machine: db 54320, API 3310, client 5183. Override via `DB_PORT`, `SERVER_PORT`, `CLIENT_PORT` (see `.env.example`; copy to `.env`). Don't switch back to 5432/3000/5173.
- After changing a package's dependencies, rebuild with fresh volumes: `docker compose up -d --build -V server` (node_modules lives in an anonymous volume that Compose otherwise carries over, so new packages wouldn't appear).

Dev container (the normal way to work on this repo):
- VS Code → "Reopen in Container" adds a `workspace` container to the same Compose project (`name: meteo-node-type` in `docker-compose.yml` makes it join instead of creating a duplicate stack). Repo is at `/workspace`; Claude Code and the `ms-ossdata.vscode-pgsql` extension are preinstalled; Claude's config persists in the `claude-code-config` volume (`CLAUDE_CONFIG_DIR=/claude-config`).
- Inside the container, Postgres is `db:5432` (not `localhost:54320`), and the npm commands below work as-is. `server/node_modules` and `client/node_modules` are Docker volumes in the container, so Linux packages don't overwrite the macOS ones on the host.
- Relative paths in `.devcontainer/docker-compose.yml` resolve from the **repo root** (Compose uses the first compose file's directory), not from `.devcontainer/`. Using `..` there mounts the folder above the repo.

Server (`cd server`):
- `npm run dev` — tsx watch; outside Docker it defaults to `postgres://meteo:meteo@localhost:5432/meteo` (run `docker compose up db` first)
- `npm test` — vitest; single test: `npx vitest run src/app.test.ts -t "GET /api/health"`
- `npm run typecheck` / `npm run build`

Client (`cd client`):
- `npm run dev` — Vite on 5173
- `npm run build` — typechecks, then builds to `dist/`
- `npm run typecheck`

## Architecture

- **HTTPS / local domain:** TLS is terminated by a separate, shared Caddy container (`caddy-proxy`, a separate project that lives next to this repo, not in it) that serves several local sites. Its `Caddyfile` has a `meteo-node-type.test` block that reverse-proxies to `meteo-node-type-client:5173` over the external `shared-dev-network` Docker network, using mkcert certs in its `ssl/` dir. So the client's `container_name` and its membership in `shared-dev-network` must not change without updating that Caddyfile. After editing the Caddyfile, reload with `docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`. Vite's `allowedHosts` and HMR-over-wss:443 settings are driven by the `PUBLIC_HOST` env var set in Compose.
- **Request path:** browser → Caddy → Vite dev server → `/api/*` proxied to the API (`client/vite.config.ts`). The proxy target comes from `API_PROXY_TARGET` (`http://server:3000` in Compose, `http://localhost:3000` otherwise). Client code always calls relative `/api/...` URLs; never hardcode the API host.
- **Server:** `src/app.ts` exports `createApp(db)`, which builds the Express app with the pg pool injected; `src/index.ts` wires in the real pool from `src/db.ts` and listens. Tests pass a stubbed `{ query }` to `createApp` with supertest, so they need no database. Keep new routes behind `createApp` so they stay testable this way.
- **Auth:** `server/src/auth.ts` has the `/api/auth/{register,login,logout,me}` routes and the `requireAuth` middleware. Passwords are bcrypt-hashed (`bcryptjs`); a session is a JWT (signed with `JWT_SECRET`) in an httpOnly, Secure, SameSite=Lax cookie named `session`, and `requireAuth` puts the decoded user on `req.user`. In `app.ts`, `app.use("/api", requireAuth(...))` sits after the public routes, so **any route registered below it is protected**; register public routes above it. On the client, `App.tsx` calls `/api/auth/me` on load and shows `AuthPage` (sign-in/register landing page) or `ItemsPage`; any 401 from the API sends the user back to sign-in. Because the cookie is `Secure`, tests can't rely on supertest's cookie jar; they copy the cookie manually (`sessionCookie()` in `app.test.ts`).
- **Database:** schema and seed data live in `db/init.sql` (`users`, `items`), mounted into Postgres's `docker-entrypoint-initdb.d`. It only runs when the `db-data` volume is first created, so to apply a schema change either run the new SQL against the live DB (`docker exec -i meteo-node-type-db psql -U meteo -d meteo < file.sql`) or wipe it with `docker compose down -v`. There is no migration tool and no ORM; queries are raw SQL via `pg` with `$1` parameters. `users.email` is unique and the API always lowercases it before writing or looking it up.
- **Modules:** server is ESM with `NodeNext` resolution, so relative imports must use the `.js` extension (`import { pool } from "./db.js"`), even from `.ts` files.
- **Docker:** both app images are dev images (run `npm run dev` with source bind-mounted for hot reload). There is no production build/compose setup.
