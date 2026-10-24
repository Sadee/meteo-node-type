# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules (always apply)

1. **Git:** never run `git commit` or `git push` (or anything that creates or publishes commits, such as `git commit --amend`, `git rebase`, `git tag`, `gh pr create`) without the user's explicit consent for that specific action. Staging files and showing a diff for review is fine.
2. **Database records:** never run `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `DROP` or `ALTER` against the live database, or anything else that changes or wipes its data (e.g. `docker compose down -v`, removing the `db-data` volume, scripts or API calls that write rows), without the user's explicit consent. Read-only `SELECT` queries are fine. Unit tests use a stubbed database and are fine to run.
3. **Personal data:** never write the user's name, email address, username, home-directory paths or any other personal details into files that are committed to the repo (CLAUDE.md, README.md, code, config, comments, test fixtures). Use placeholders such as `user@example.com` and paths relative to the repo instead.

`.claude/settings.json` backs these rules: it asks before commit/push/merge/rebase/tag/`gh pr`, before discarding work (`git reset --hard`, `git clean`, `git restore`, `git branch -D`, `rm -rf`), before `psql` and database- or volume-wiping Docker commands; it denies reading real `.env` files (`.env.example` stays readable), force-pushes and `npm publish`. Deny rules on `Read` don't stop shell commands like `cat .env`, so don't print env files from the shell either.

## Overview

Demo full-stack TypeScript app: Express API (`server/`), React + Vite frontend (`client/`), PostgreSQL. Everything runs locally via Docker Compose. `server/` and `client/` are independent npm packages (no workspace root `package.json`), so run npm commands from inside each directory.

## Commands

Full stack (from repo root):
- `docker compose up --build` — start the stack, then open https://meteo-node-type.test (requires the external `caddy-proxy` stack to be running; see below).
- `docker compose down` — stop; add `-v` to wipe the database volume (needed to re-run all of `db/migrations/`).
- Host ports are deliberately non-default because many other local sites run on this machine: db 54320, API 3310, client 5183. Override via `DB_PORT`, `SERVER_PORT`, `CLIENT_PORT` (see `.env.example`; copy to `.env`). Don't switch back to 5432/3000/5173.
- After changing a package's dependencies, rebuild with fresh volumes: `docker compose up -d --build -V server` (node_modules lives in an anonymous volume that Compose otherwise carries over, so new packages wouldn't appear).

All checks (run before pushing, from repo root, inside the dev container):
- `scripts/pre-push-check.sh` — gitleaks secret scan (history + working tree), then per package: ESLint, Prettier check, typecheck, tests, `npm audit --audit-level=high` (needs network), plus the client build; prints a summary and exits non-zero on any failure (`--verbose` shows output of passing checks too). Add new checks as `check "<label>" <dir> <command>` lines. It can be installed as a git pre-push hook (`ln -s ../../scripts/pre-push-check.sh .git/hooks/pre-push`); outside a container (no `/.dockerenv`) it stops at once with a "push via the VS Code terminal" message, because node_modules only exist in the dev container.

Formatting: one Prettier config for the repo in `.prettierrc` (print width 120); ESLint configs are `server/eslint.config.js` and `client/eslint.config.js` (typescript-eslint, plus react-hooks on the client). gitleaks is a pinned binary installed by `scripts/install-gitleaks.sh` (run from the dev container's `postCreateCommand`).

Dev container (the normal way to work on this repo):
- VS Code → "Reopen in Container" adds a `workspace` container to the same Compose project (`name: meteo-node-type` in `docker-compose.yml` makes it join instead of creating a duplicate stack). Repo is at `/workspace`; Claude Code and the `ms-ossdata.vscode-pgsql` extension are preinstalled; Claude's config persists in the `claude-code-config` volume (`CLAUDE_CONFIG_DIR=/claude-config`).
- Inside the container, Postgres is `db:5432` (not `localhost:54320`), and the npm commands below work as-is. `server/node_modules` and `client/node_modules` are Docker volumes in the container, so Linux packages don't overwrite the macOS ones on the host.
- Relative paths in `.devcontainer/docker-compose.yml` resolve from the **repo root** (Compose uses the first compose file's directory), not from `.devcontainer/`. Using `..` there mounts the folder above the repo.

Server (`cd server`):
- `npm run dev` — tsx watch; outside Docker it defaults to `postgres://meteo:meteo@localhost:5432/meteo` (run `docker compose up db` first)
- `npm test` — vitest; single test: `npx vitest run src/app.test.ts -t "GET /api/health"`
- `npm run typecheck` / `npm run build`
- `npm run lint` (ESLint, zero warnings allowed) / `npm run format` (Prettier, writes) / `npm run format:check`

Client (`cd client`):
- `npm run dev` — Vite on 5173
- `npm run build` — typechecks, then builds to `dist/`
- `npm run typecheck`
- `npm run lint` / `npm run format` / `npm run format:check` — same as server
- `npm test` — Vitest + React Testing Library in jsdom (`npm run test:watch` to re-run on save); single file: `npx vitest run src/modules/sites`. Tests sit next to the code as `*.test.ts(x)`, stub `fetch` with `mockFetch()` from `src/test/mockFetch.ts` (no server needed), and query by role/label/text as a user would.

## Architecture

- **HTTPS / local domain:** TLS is terminated by a separate, shared Caddy container (`caddy-proxy`, a separate project that lives next to this repo, not in it) that serves several local sites. Its `Caddyfile` has a `meteo-node-type.test` block that reverse-proxies to `meteo-node-type-client:5173` over the external `shared-dev-network` Docker network, using mkcert certs in its `ssl/` dir. So the client's `container_name` and its membership in `shared-dev-network` must not change without updating that Caddyfile. After editing the Caddyfile, reload with `docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`. Vite's `allowedHosts` and HMR-over-wss:443 settings are driven by the `PUBLIC_HOST` env var set in Compose.
- **Request path:** browser → Caddy → Vite dev server → `/api/*` proxied to the API (`client/vite.config.ts`). The proxy target comes from `API_PROXY_TARGET` (`http://server:3000` in Compose, `http://localhost:3000` otherwise). Client code always calls relative `/api/...` URLs; never hardcode the API host.
- **Server:** `src/app.ts` exports `createApp(db)`, which builds the Express app with the pg pool injected; `src/index.ts` wires in the real pool from `src/db.ts` and listens. Tests pass a stubbed `{ query }` to `createApp` with supertest, so they need no database. Keep new routes behind `createApp` so they stay testable this way.
- **Domain:** a manufacturer's sites worldwide. `users.role` is `director` (HQ: CRUD on sites, creates manager accounts, assigns managers to sites) or `manager` (read-only view of the sites assigned to them). `sites` have name, description, city, country, latitude/longitude and status (`planned|active|inactive|closed`); `site_managers` is the many-to-many link (a site has 0..n managers).
- **Auth:** `server/src/auth.ts` has the `/api/auth/{login,logout,me}` routes and the `requireAuth` / `requireRole(role)` middleware. Registration is closed: directors create managers via `POST /api/managers` (`server/src/users.ts`); directors exist only via seed data or a manual `UPDATE users SET role = 'director'`. Passwords are bcrypt-hashed (`bcryptjs`); a session is a JWT (signed with `JWT_SECRET`, carrying the role) in an httpOnly, Secure, SameSite=Lax cookie named `session`, and `requireAuth` puts the decoded user on `req.user`. A role change takes effect at the user's next sign-in; tokens without a role are rejected. In `app.ts`, `app.use("/api", requireAuth(...))` sits after the public routes, so **any route registered below it is protected**; register public routes above it. Write routes check `requireRole("director")`; manager reads are scoped in SQL (`server/src/sites.ts`), and a site a manager isn't assigned to is a 404. On the client, `App.tsx` calls `/api/auth/me` on load and shows `AuthPage` (sign-in only) or the app; any 401 from the API sends the user back to sign-in (`isUnauthorized()` in `src/shared/api.ts`). The client hides director-only UI, but the API is what enforces it. Because the cookie is `Secure`, tests can't rely on supertest's cookie jar; they copy the cookie manually or mint one with `cookieFor(user)` (`server/src/test/helpers.ts`).
- **Database:** schema and seed data are numbered SQL files in `db/migrations/` (`001_init.sql`, `002_user_roles.sql`, `003_sites.sql`, `004_drop_items.sql`, …); the folder is mounted as Postgres's `docker-entrypoint-initdb.d`, so all of them run in name order, but only when the `db-data` volume is first created. To change the schema, add the next numbered file (never edit an applied one; keep it re-runnable with `IF NOT EXISTS` / `ON CONFLICT`), then either run just that file against the live DB from the host (`docker exec -i meteo-node-type-db psql -U meteo -d meteo < db/migrations/00N_x.sql`; the dev container has no `psql`/`docker`) or wipe it with `docker compose down -v`. Seeded demo accounts (`director@example.com`, `manager1@example.com`, `manager2@example.com`) all use the password `password123`. There is no migration tool and no ORM; queries are raw SQL via `pg` with `$1` parameters. `users.email` is unique and the API always lowercases it before writing or looking it up.
- **Client structure:** `src/main.tsx` → `src/app/` (shell: `App.tsx` hash routing for `#/`, `#/sites`, `#/sites/new`, `#/sites/:id`, `#/sites/:id/edit`, `#/managers`, `#/profile`, with director-only routes falling back to the dashboard; `Layout.tsx` top bar/footer; `Dashboard.tsx` cards). Features live in `src/modules/<name>/` (`user` incl. `ManagersPage`, `sites`), each with `types.ts`, `api.ts` (typed calls built on `src/shared/api.ts`), its pages/components, its own CSS, and an `index.ts` barrel; import a module only through its `index.ts`. Modules don't import each other; the `app/` shell composes them. Shared theme tokens and base styles stay in `src/index.css`.
- **Modules:** server is ESM with `NodeNext` resolution, so relative imports must use the `.js` extension (`import { pool } from "./db.js"`), even from `.ts` files.
- **Docker:** both app images are dev images (run `npm run dev` with source bind-mounted for hot reload). There is no production build/compose setup.
