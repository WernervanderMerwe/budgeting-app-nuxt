# Dev Lifecycle

Canonical reference for starting, stopping, and deploying the Budgeting App across all three
tiers. Read this before any dev, qa, or deployment work.

## Overview — Three-Tier Model

| Tier | Database | App process | One-shot start | Use case |
|---|---|---|---|---|
| **dev** | Local PG16 container (`5434`) | Nuxt dev server (host process, hot reload) | `pnpm dev:up` | Daily iteration |
| **qa** | Same local PG16 container | Nuxt production container (same `Dockerfile` as VPS) | `pnpm qa:up` | Pre-deploy build validation |
| **production** | Shared `infra-postgres` on the VPS | Nuxt production container on the VPS | `pnpm vps:deploy` | Live production |

**qa is literally production** — same `Dockerfile`, same `docker-compose.yml`, same env var
shape as `.env.production`. The only differences are which Postgres it points at and which
mail transport it uses. If qa builds and runs cleanly, the VPS deploy will too.

All three tiers live in the **single `docker-compose.yml`**, separated by profiles (`dev`,
`qa`, `production`).

**Auth is [better-auth](https://better-auth.com)** talking directly to Postgres via Prisma.
Magic-link sign-in only — no passwords.

---

## Tier 1: dev

**What runs:** `budgeting-postgres-dev` + `budgeting-mailpit` containers, plus the Nuxt dev
server as a host process (hot reload, source maps).

**Ports:** Nuxt `3000`, Postgres `5434`, Mailpit SMTP `1027` / web UI `8027`.

**Start (one-shot):**
```bash
pnpm dev:up
```
Checks Docker is running, starts the `dev` profile containers if Postgres isn't already up,
then execs `pnpm dev` in the foreground.

**Stop:**
```bash
pnpm dev:down
```
Kills port 3000 and stops the `dev` profile containers.

**Manual steps (if needed):**
```bash
pnpm db:up     # start Postgres + Mailpit only
pnpm dev       # start Nuxt only (kills port 3000 first)
pnpm dev:kill  # free port 3000
```

**Emails in dev go to Mailpit, not the internet.** Open http://localhost:8027 to read
anything the app sends — magic-link sign-in emails will NOT arrive in a real inbox while
`NUXT_SMTP_HOST` points at Mailpit. Check the web UI, not your email client.

> `.env` is the single source of truth for dev — `dev:up` does not touch it.

---

## Tier 2: qa

**What runs:** the same local PG16 container, plus the app built from the production
`Dockerfile` and run as the `budgeting-qa` container. Mirrors VPS topology.

**Port:** Nuxt `3422` (set via `PORT` in `.env.qa`; avoids clashing with dev on `3000`). Uses
`network_mode: host` so the container can reach Postgres on `localhost:5434` and Mailpit on
`localhost:1027`.

```bash
pnpm qa:up     # build + start detached
pnpm qa:logs   # tail
pnpm qa:down   # stop
```

**Env file:** `.env.qa` — same shape as `.env.production`, but `DATABASE_URL`/`DIRECT_URL`
point at local PG16, `BETTER_AUTH_URL` is `http://localhost:3422`, and mail goes to Mailpit
instead of the Resend SMTP gateway.

**This is the deploy gate — run it before every production deploy.** A passing dev server
proves nothing about the production build: dev runs through Vite, production runs bundled
Nitro output (`.output`, no `node_modules`, no Prisma CLI in the image). qa shares the dev
Postgres and Mailpit, so it also exercises real DB queries and real mail sending without
touching production data or the Resend account.

---

## Tier 3: production

**Live URL:** https://budget.wernerbuildsapps.co.za

**What runs on the VPS:** `budgeting-app` (published on `127.0.0.1:3200`, behind Nginx +
Cloudflare Origin Cert), talking to the **shared `infra-postgres`** container over the
external `infra_default` network. There is no per-app Postgres for this app.

**Env file:** `.env.production` on the VPS at `/root/apps/budgeting-app`. Keep it in
lockstep with `.env.production.example` in this repo — when you change one, update the other.

**Deploy flow (GHCR-based, no on-VPS builds):**

```bash
# 1. Work on dev, then bump the version
pnpm version:patch          # or version:minor / version:major

# 2. QA gate — must pass before you go near main
pnpm qa:up && pnpm qa:logs

# 3. Merge dev -> main, push
git switch main && git pull --ff-only origin main
git merge dev --no-edit
git push origin main

# 4. Deploy
pnpm vps:deploy
```

`pnpm vps:deploy` refuses to run unless: you're on `main`, the working tree is clean, and
local `main` matches `origin/main`. It warns (and asks) if the last commit on `main` isn't a
version bump, and warns separately if `prisma/migrations` changed since the last release tag
(a reminder to run `pnpm vps:db:migrate`). It then builds the image locally, pushes `:x.y.z`
and `:latest` to GHCR (`ghcr.io/wernervandermerwe/budgeting-app`), and has the VPS pull and
restart via `docker compose --profile production up -d`.

**Rollback / pin a specific version:**
```bash
pnpm vps:deploy 0.1.14
```
Skips the build — the VPS pulls and runs that tag directly. This is why every deploy is
version-tagged.

**GitHub Actions runs CI only** (`ci.yml` — lint + typecheck). There is no deploy-on-push
workflow; deploys are always triggered locally.

**Other VPS commands:**
```bash
pnpm vps:logs      # tail container logs
pnpm vps:status    # container status
```

Never deploy from `dev`. Deploy only from `main` via `pnpm vps:deploy`.

---

## Env File Rules

One env file per tier. `.env` is dev, `.env.qa` is qa, `.env.production` mirrors production
(kept in sync with `.env.production.example`, which IS tracked). All actual env files are
gitignored.

**Required vars:**

```bash
# Database (Prisma)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."   # migrations only

# better-auth
BETTER_AUTH_SECRET="..."     # openssl rand -base64 32; per-tier, never shared
BETTER_AUTH_URL="..."        # MUST match the origin the browser uses for that tier

# Mail (nodemailer, see server/utils/mail.ts)
NUXT_SMTP_HOST=""            # dev/qa: localhost (Mailpit) | prod: smtp.resend.com
NUXT_SMTP_PORT=""            # dev/qa: 1027 | prod: 587
NUXT_SMTP_USER=""            # prod: "resend" (literally); unset in dev/qa — Mailpit needs no auth
NUXT_SMTP_PASS=""            # prod: Resend API key; unset in dev/qa
NUXT_SMTP_FROM=""            # e.g. "Budget App <noreply@send.wernerbuildsapps.co.za>"
```

**`BETTER_AUTH_URL` must match the browser's origin for that tier** — `http://localhost:3000`
in dev, `http://localhost:3422` in qa, `https://budget.wernerbuildsapps.co.za` in production.
A mismatch breaks cookie/callback handling.

**Mail sending has two failure modes, by design:**
- `sendMail()` in `server/utils/mail.ts` is **fail-soft** at the transport level — if
  `NUXT_SMTP_HOST` is unset, it logs a warning and returns `{ sent: false }` without throwing.
  An unset SMTP host in production is a real outage that produces no error in the logs unless
  you know to look for the warning.
- `sendMagicLinkEmail()` in `server/utils/mailer.ts` wraps `sendMail()` and **fails loud** —
  it throws if `result.sent` is false. So in practice a magic-link request with a broken SMTP
  config surfaces as a 500 to the user, but a *silently misconfigured* host (unset entirely)
  is the case to watch for, since the underlying warning is easy to miss in container logs.

---

## Database Schema Changes

**This app uses `prisma migrate` — NOT `db push`.** Migration files are committed to
`prisma/migrations/` and applied explicitly; there's no diff-and-apply step against a live DB.

```bash
pnpm db:migrate       # local — creates a new migration file (prisma migrate dev)
pnpm vps:db:migrate   # production — applies committed migrations (prisma migrate deploy)
```

**Local:** `pnpm db:migrate` runs `prisma migrate dev` against the dev Postgres, generating
and applying a migration file in one step.

**Production:** the runtime image contains only `.output` — no Prisma CLI, no
`node_modules`, no `prisma/` folder. `pnpm vps:db:migrate` (`scripts/vps-db.sh migrate`) works
around this by running migrations **from the desktop**: it opens an SSH port-forward into the
VPS's `infra-postgres` container, prompts for the DB password (read from the VPS's
`/root/infra/postgres/.env`), then runs `prisma migrate deploy` against the forwarded port
with both `DATABASE_URL` and `DIRECT_URL` set. The tunnel is torn down automatically on exit.

After any schema change, regenerate the Prisma client (done automatically by `pnpm build`/
`pnpm dev`, or manually via `pnpm exec prisma generate`).

---

## Common Failure Modes

| Symptom | Root cause | Fix |
|---|---|---|
| Prisma can't connect locally | Postgres not up, or `DATABASE_URL` on the wrong port | `pnpm db:up`; dev Postgres is `5434`, not 5432 |
| Auth works in dev, breaks in qa/prod | `BETTER_AUTH_URL` doesn't match the browser origin | Set it per tier |
| No magic-link emails, but no error either | `NUXT_SMTP_HOST` unset — `sendMail()` fails soft, warning-only | Set the SMTP block; check Mailpit (dev/qa, `http://localhost:8027`) or Resend logs (prod) |
| Magic-link request returns a 500 | SMTP host set but send actually failed | `sendMagicLinkEmail()` throws loudly on `{ sent: false }` — check the SMTP creds/network |
| Port 3000 already in use | Previous Nuxt process alive | `pnpm dev:kill` |
| qa container can't reach Postgres/Mailpit | `network_mode: host` missing from the `budgeting-qa` service | Required to reach `localhost:5434` / `localhost:1027` |
| Builds in dev, fails in qa | Vite dev vs bundled Nitro output differ | Always run the qa gate before deploying |
| `vps:deploy` refuses to run | Not on `main`, dirty tree, or `main` behind `origin/main` | The script prints which gate failed |
| Deploy succeeds, app won't start | VPS `.env.production` out of sync with `.env.production.example` | Update the VPS env, then redeploy |
| Schema change deployed but DB unchanged | Migrations aren't applied automatically — the image has no Prisma CLI | Run `pnpm vps:db:migrate` before or after the deploy |

---

## Cross-References

- `.claude/CLAUDE.md` — tech stack, conventions, project structure
- `deploy/README.md` — VPS first-time setup, DNS, pipeline, migrations
- `docs/plans/2026-07-07-phase2e-vps-hosted-cutover.md` — the original VPS cutover plan
