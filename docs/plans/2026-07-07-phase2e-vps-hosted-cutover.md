# Phase 2e (revised) — VPS-Hosted Cutover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the budgeting app on the HostAfrica VPS using the ecom template's pipeline (local Docker build → ghcr.io → VPS pull, nginx + Cloudflare Origin Cert), eliminating Cloudflare Pages, Hyperdrive, and the Zero Trust card requirement entirely.

**Architecture:** The Nuxt app builds as a plain Node server (`node_server` preset) into a two-stage Docker image, built on Werner's desktop and pushed to GitHub Container Registry. The VPS pulls the image and runs it on `127.0.0.1:3200`, joined to the existing shared `infra-postgres` Docker network so `DATABASE_URL` points at the postgres container directly — no tunnel, no Hyperdrive, no open DB ports. nginx terminates a Cloudflare Origin Cert on 443 and proxies `budget.wernerbuildsapps.co.za` (orange-cloud A record) to the app.

**Tech Stack:** Nuxt 4 (node_server), pnpm 10 (switching from npm), Prisma 7 + pg, better-auth magic-link, Resend, Docker + ghcr.io, nginx, Cloudflare proxied DNS.

**Supersedes:** `2026-07-01-phase2e-vps-cutover.md` (Steps C/D/F/G of that plan — Zero Trust, Hyperdrive, Pages env — are dead. Its Steps A/B/E survive as existing VPS state.)

---

## Decisions locked with Werner (2026-07-07)

- **Host the app on the VPS**, not Cloudflare Pages. No payment method / Zero Trust needed.
- **Ecom template is the canonical pipeline** for all apps: build image on the gaming desktop (this WSL machine), push to ghcr, pull on VPS. Never build on the VPS.
- **Switch this repo npm → pnpm** to match the ecom stack (lockfile committed).
- **Werner pushes the branch to GitHub before the VPS steps** — the VPS clones the repo like ecom does. Do not push for him (his rule).
- DB stays the shared **`infra-postgres`** (`/root/infra/postgres`, decided 2026-07-01) — already provisioned, schema already applied (16 tables). The ecom-style per-app postgres container is NOT used here.
- App URL: **`https://budget.wernerbuildsapps.co.za`**. VPS port: **`127.0.0.1:3200`** (ecom has 3100, tutoring 3001). Image: **`ghcr.io/wernervandermerwe/budgeting-app`**.
- Old prod (Cloudflare Pages + Supabase Cloud) stays untouched until Werner confirms the VPS deployment — it IS the rollback.

## Existing state (do not redo)

- VPS: `/root/infra/postgres` — shared postgres 16 (`infra-postgres`, loopback `127.0.0.1:5544`), `budgeting` DB + scoped `budgeting` role, password in `/root/infra/postgres/.env`. All 16 tables migrated. VPS map: `/root/VPS-GUIDE.md`.
- VPS also runs a `cloudflared` container (`vps-infra` tunnel) whose only route was `budget-db.wernerbuildsapps.co.za` → TCP 5432 for Hyperdrive. **Now unused** — cleanup in Task 12.
- Ecom reference files (template source): `~/projects/ecommerce-template/{Dockerfile,.dockerignore,docker-compose.yml,scripts/build-push.sh,scripts/vps-pull.sh,deploy/nginx/*,deploy/README.md}`.
- Branch `migrate/vps-postgres-modern-stack` has all Phase 1+2 code, verified locally (magic link → session → Profile auto-created).

## Conventions for the executor

- Repo root: `/home/bullzeye/projects/budgeting-app-nuxt`. All file paths below are relative to it.
- This is infra work — no unit tests. Every task ends with a **Verify** step (exact command + expected output) instead. Do not claim a task done without running it (superpowers:verification-before-completion).
- Project hook policy: run the superpowers:code-reviewer agent before the major feature commits (Tasks 3 and 6 bundle the reviewable diffs).
- SSH to the VPS: host alias `vps` (root@169.239.181.75). Confirm each **write** action on the VPS with Werner if it touches anything outside `/root/apps/budgeting-app` or `/etc/nginx`.
- **Never deploy/promote without Werner confirming** (his global rule). The gates are marked ⛔.

---

## Task 1: Switch npm → pnpm

**Files:**
- Modify: `package.json` (add `packageManager` field)
- Modify: `.gitignore` (remove line 11 `package-lock.json` — with npm gone, an accidental `npm install` should surface as untracked noise in `git status`, not be silently hidden; also ensure `pnpm-lock.yaml` is NOT ignored)
- Create: `pnpm-lock.yaml` (generated)
- Delete: `node_modules/`, `package-lock.json`, `.nuxt/`, `.output/` (ALL npm-era generated state — gitignored; removal explicitly sanctioned by Werner 2026-07-07, so no re-ask needed)

**Step 1: Pin the package manager (no corepack locally)**

pnpm **10.26.2 is already installed globally** on this machine (nvm npm-global, verified 2026-07-07) — do NOT run `corepack enable`/`prepare` here; that's already-done work. The VPS never runs pnpm either (it only pulls the image). Corepack appears exactly once in this plan: inside the Dockerfile, where the bare `node:22-alpine` image needs it (same as ecom's Dockerfile).

Add to `package.json` (top level, after `"private": true`) — inert for the local global pnpm, but pins the version corepack uses inside the Docker build:

```json
"packageManager": "pnpm@10.26.2",
```

(Ecom pins 10.29.3; we pin what's actually installed here. Bump both in lockstep whenever Werner upgrades his global pnpm.)

**Step 2: Clean slate — remove ALL npm-era generated state, then install**

A package-manager switch means nothing generated under npm survives: not just `node_modules`, but the npm lockfile and every build/prepare artifact derived from the old install (`.nuxt` from `nuxt prepare`/dev, `.output` from builds). Leaving any of them is a stale-breadcrumb bug of exactly the kind Task 6b exists to prevent.

pnpm 10 **blocks dependency postinstall scripts by default** — without an allowlist, `@prisma/engines` etc. silently don't run. Add to `package.json` first (mirrors ecom's list minus its extras like sharp/@sentry/cli, plus our Tailwind v4 oxide):

```json
"pnpm": {
  "onlyBuiltDependencies": [
    "@prisma/engines",
    "prisma",
    "esbuild",
    "@tailwindcss/oxide",
    "@parcel/watcher",
    "unrs-resolver"
  ]
},
```

```bash
rm -rf node_modules package-lock.json .nuxt .output
pnpm install
```

Expected: `pnpm-lock.yaml` created; postinstall (`nuxt prepare`) regenerates `.nuxt`; no foreign-lockfile warning. **If pnpm prints an "Ignored build scripts" warning, add those packages to `onlyBuiltDependencies` and re-run** — the warning must be gone before moving on.

**Step 3: Fix .gitignore**

Remove line 11 (`package-lock.json`) — see Files note. Then confirm the pnpm lockfile is trackable and the npm one is really gone:

```bash
git check-ignore pnpm-lock.yaml; echo "exit=$?"
ls package-lock.json 2>&1
```

Expected: `exit=1` (not ignored) and `No such file or directory`.

**Step 4: Verify the pnpm install is sound (no build yet)**

Do NOT run `pnpm build` here — the still-active `cloudflare_pages` preset would regenerate the `dist/` directory this migration is purging. The full build is verified in Task 2 under the new preset. Instead:

```bash
npx nuxt prepare && npx vue-tsc --noEmit && echo INSTALL-OK
```

Expected: `INSTALL-OK`, 0 type errors (same as the pre-switch baseline).

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: switch npm -> pnpm to match ecom template stack"
```

---

## Task 2: Retarget Nitro from Cloudflare Pages to node_server

**Files:**
- Modify: `nuxt.config.ts:23-45` (the `nitro` block)

**Step 1: Replace the nitro block**

In `nuxt.config.ts` replace the whole `nitro: { ... }` block with:

```ts
  nitro: {
    preset: 'node_server',
    prerender: {
      crawlLinks: false,
    },
  },
```

(Removes: `cloudflare_pages` preset, `experimental.wasm`, `rollupConfig.external: ['cloudflare:sockets']`, AND both unenv alias mocks — deliberately. The mocks were edge-era workarounds; Step 2 re-adds only what the node build proves it needs.)

**Step 2: Build; re-add only the mocks the node build actually needs**

```bash
pnpm build
```

If (and only if) the build fails resolving `pg-native` or `@react-email/render`, re-add just the failing one(s) to `nitro.alias` pointing at `./node_modules/unenv/dist/runtime/mock/empty.mjs`, with a comment stating why: `pg-native` is an optional native binding of `pg`; `@react-email/render` is a **peer dependency of the resend SDK** (for sending React email components — we send HTML strings, so it is never executed). Rebuild until green.

Expected: exit 0, Nitro `node-server` output summary, `.output/server/index.mjs` exists, and the alias list contains only entries the build demonstrably required.

**Step 3: Boot the built server against the local dev DB**

```bash
docker compose up -d   # local dev postgres on :5434 (still un-profiled until Task 5)
set -a; source .env.local; set +a
pnpm cleanup && PORT=3000 node .output/server/index.mjs &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login
```

Expected: `200`. Then kill the server (`fuser -k 3000/tcp`).

**Step 4: Do NOT commit yet** — Task 3 is part of the same reviewable change.

---

## Task 3: Simplify `getPrisma` (drop the Hyperdrive branch) and remove Pages artifacts

**Files:**
- Modify: `server/utils/db.ts` (full replacement below)
- Delete: `server/plugins/prisma.ts` (its ONLY job is disconnecting per-request Cloudflare clients/pools after each response — dead code with a shared client)
- Modify: `server/lib/auth.ts:19` (drop the `event.context.cloudflare?.env` lookup — read `process.env` directly)
- Modify: `server/utils/mailer.ts:10` (same cf-env fallback — read `process.env` directly; fix the lines 5–9 comment)
- Modify: `server/utils/errors.ts:6` and `server/api/auth/[...all].ts:5` (Cloudflare/Hyperdrive comments — reword; behavior unchanged)
- Delete: `wrangler.toml`
- Modify: `package.json` (remove `wrangler:dev` and `cf:deploy` scripts)
- Check/Modify: `.env.example` (remove any Hyperdrive/Cloudflare mentions; ensure `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM` are documented)

**Step 1: Replace `server/utils/db.ts` entirely with:**

```ts
import type { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Extend H3EventContext for type safety
declare module 'h3' {
  interface H3EventContext {
    prisma?: PrismaClient
  }
}

// Single shared client + pool for the lifetime of the Node process.
// Prisma 7 requires a driver adapter (the schema datasource no longer carries
// a url - it lives in prisma.config.ts for CLI/migrations only).
let client: PrismaClient | null = null

/**
 * Get the Prisma client. The event parameter is kept so the ~47 call sites
 * (and the per-request better-auth construction) stay untouched.
 */
export function getPrisma(_event?: H3Event): PrismaClient {
  if (!client) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    client = new PrismaClient({ adapter })
  }
  return client
}
```

**Step 2: Remove the per-request plumbing and cf-env fallbacks**

```bash
git rm server/plugins/prisma.ts
```

In `server/lib/auth.ts`, the env lookup (line ~19) currently builds a `cf` record from `event.context.cloudflare?.env` and falls back to `process.env` — replace it so values come from `process.env` only (keep the surrounding per-request `serverAuth(event)` structure; it's cheap and every caller depends on its signature). Same change in `server/utils/mailer.ts` (line ~10). Update the now-wrong comments in both files, plus `server/utils/errors.ts:6` and `server/api/auth/[...all].ts:5`.

Then verify nothing is left:

```bash
grep -rni "hyperdrive\|cloudflare\|_prismaPool" server/ app/ --include="*.ts" --include="*.vue"
```

Expected: **zero hits**.

**Step 3: Remove Pages artifacts**

```bash
git rm wrangler.toml
```

In `package.json` scripts, delete the `wrangler:dev` and `cf:deploy` lines. Also delete `.dev.vars.sh` if it exists (`git rm` if tracked, plain `rm` needs Werner's OK if gitignored — ask).

**Step 4: Verify build + typecheck + boot**

```bash
pnpm build && npx vue-tsc --noEmit
```

Expected: build exit 0, typecheck 0 errors. Repeat the Task 2 Step 3 boot check (login page 200, and this time also `curl -s -X POST http://127.0.0.1:3000/api/auth/sign-in/magic-link -H 'content-type: application/json' -d '{"email":"test@example.com","callbackURL":"/confirm"}'` → `{"status":true}`).

**Step 5: Code review, then commit**

Run superpowers:code-reviewer over the Task 2+3 diff, fix findings, then:

```bash
git add -A
git commit -m "feat(deploy): retarget to node_server, drop Hyperdrive/Pages plumbing"
```

---

## Task 4: Dockerfile + .dockerignore (from ecom template)

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Step 1: Create `Dockerfile`** (ecom's, with our prisma-in-build-script difference):

```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm (built into Node 22; needed HERE because the
# bare alpine image has no pnpm — locally we use the global install)
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm store cache persisted across builds
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build (runs `prisma generate && nuxt build`; dummy URL — generate only
# emits the client, no DB connection is made)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# Production stage — slim runtime only
FROM node:22-alpine AS runner

WORKDIR /app

# Copy built output (Nitro bundles everything, no node_modules needed)
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

**Step 2: Create `.dockerignore`** (copy ecom's and adjust; at minimum):

```
node_modules
.output
.nuxt
.git
.env*
.dev.vars*
.wrangler
dist
.claude
docs
deploy
scripts
*.md
```

Note `.dev.vars*` explicitly: it can hold secrets and the `.env*` pattern does NOT match it.

(Compare with `~/projects/ecommerce-template/.dockerignore` and carry over anything else relevant. Note: `.env.local` must never end up in the image.)

**Step 3: Verify the image builds and runs**

```bash
docker build -t ghcr.io/wernervandermerwe/budgeting-app:test .
docker run --rm -d --name budgeting-test -p 127.0.0.1:3011:3000 \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://budgeting:budgeting_dev@host.docker.internal:5434/budgeting" \
  -e BETTER_AUTH_SECRET=test-secret-at-least-32-characters-long \
  -e BETTER_AUTH_URL=http://127.0.0.1:3011 \
  -e RESEND_API_KEY=re_dummy -e RESEND_FROM="Test <t@example.com>" \
  ghcr.io/wernervandermerwe/budgeting-app:test
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3011/login
docker logs budgeting-test | tail -5
docker stop budgeting-test
```

Expected: `200`, logs show Nitro listening, no errors. (Match the dev-postgres user/password/db against `docker-compose.yml` before running.)

**Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat(deploy): two-stage Dockerfile from ecom template"
```

---

## Task 5: docker-compose profiles + production app service

**Files:**
- Modify: `docker-compose.yml` (full replacement below)
- Modify: `package.json` (`db:up`/`db:down` gain the dev profile flag)
- Create: `.env.production.example`

**Step 1: Replace `docker-compose.yml`** — keep the existing dev service exactly as it is today (read it first; the block below assumes the current names `budgeting-postgres-dev`, port 5434 — reconcile with reality), add profiles and the production app:

```yaml
services:
  # ── Development ─────────────────────────────────────────
  postgres-dev:
    # >>> carry over the EXISTING dev service definition verbatim,
    # >>> only adding:  profiles: ["dev"]

  # ── Production (VPS) ────────────────────────────────────
  app:
    image: ghcr.io/wernervandermerwe/budgeting-app:latest
    container_name: budgeting-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:3200:3000"
    env_file: .env.production
    networks:
      - default
      - infra
    profiles: ["production"]

networks:
  infra:
    external: true
    name: postgres_default   # VERIFY on VPS in Task 9 (docker network ls) and fix if different
```

Note: no postgres service in the production profile — the DB is the shared `infra-postgres` (differs from ecom deliberately).

**Step 2: Update dev scripts in `package.json`**

```json
"db:up": "docker compose --profile dev up -d",
"db:down": "docker compose --profile dev down",
```

**Step 3: Create `.env.production.example`**

```env
# VPS production env — copy to .env.production on the VPS and fill in.
# DB: shared infra-postgres; password lives in /root/infra/postgres/.env on the VPS
DATABASE_URL=postgresql://budgeting:CHANGE_ME@infra-postgres:5432/budgeting
BETTER_AUTH_SECRET=CHANGE_ME_openssl_rand_base64_32
BETTER_AUTH_URL=https://budget.wernerbuildsapps.co.za
RESEND_API_KEY=re_CHANGE_ME
RESEND_FROM=Budget App <noreply@send.wernerbuildsapps.co.za>
NODE_ENV=production
```

(`DATABASE_URL` host `infra-postgres` = the container's network alias on the shared network — verify alias in Task 9.)

**Step 4: Verify dev profile still works**

```bash
docker compose --profile dev up -d && docker compose --profile dev ps
```

Expected: dev postgres up/healthy; the `app` service is NOT started.

**Step 5: Commit**

```bash
git add docker-compose.yml package.json .env.production.example
git commit -m "feat(deploy): compose production profile joining shared infra-postgres"
```

---

## Task 6: Deploy scripts + nginx conf (from ecom template)

**Files:**
- Create: `scripts/build-push.sh` (copy `~/projects/ecommerce-template/scripts/build-push.sh`, change `IMAGE="ghcr.io/wernervandermerwe/budgeting-app"`)
- Create: `scripts/vps-pull.sh` (copy ecom's; change `IMAGE`, and the final hints/greps from `ecommerce`→`budgeting`, log hint `docker logs -f budgeting-app`)
- Create: `deploy/nginx/budgeting-app.conf` (below)
- Create: `deploy/README.md` (ecom's structure, adjusted: repo URL, `/root/apps/budgeting-app`, port 3200, `prisma migrate deploy` instead of `db push`, no seed, no uploads, DB = shared infra-postgres; document that migrations run FROM THE DESKTOP over the SSH forward — the runtime image contains only `.output`, no prisma CLI, so ecom's `docker compose exec app npx prisma db push` pattern does not apply here)

**Step 1: Copy + adapt the two scripts; `chmod +x scripts/*.sh`**

**Step 2: Create `deploy/nginx/budgeting-app.conf`:**

```nginx
server {
    listen 443 ssl http2;
    server_name budget.wernerbuildsapps.co.za;

    # Cloudflare Origin Certificate (shared with ecom — covers *.wernerbuildsapps.co.za; verified in Task 10)
    ssl_certificate     /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name budget.wernerbuildsapps.co.za;
    return 301 https://$host$request_uri;
}
```

**Step 3: Verify scripts are sane**

```bash
bash -n scripts/build-push.sh && bash -n scripts/vps-pull.sh && echo OK
```

Expected: `OK`.

**Step 4: Code review (Tasks 4–6 diff), fix findings, commit**

```bash
git add scripts/ deploy/
git commit -m "feat(deploy): ghcr build/pull scripts + nginx conf for budget subdomain"
```

---

## Task 6b: Cloudflare-Pages breadcrumb sweep (repo side)

Purge every remnant of the abandoned Pages/Hyperdrive pipeline so no future agent (or Werner, months from now) mistakes it for live architecture. This sits BEFORE the push gate so the cleanup rides the same branch push. Full inventory from the 2026-07-07 sweep:

**Files:**
- Modify: `README.md:20,28,42,76-92` — rewrite the deployment section: VPS + Docker + ghcr (point at `deploy/README.md`), env vars from `.env.production`, remove the Hyperdrive/wrangler instructions and the Cloudflare-account prerequisite
- Modify: `.gitignore:40-43` — delete the `# Wrangler` section (`.wrangler`, `.dev.vars`, `.dev.vars.sh`); keep line 7 `dist` only if something still emits it (node_server outputs `.output/` — if nothing does, remove it too)
- Modify: `.claude/CLAUDE.md` — moved here from Task 12 so it rides the same branch push: tech stack section (better-auth magic-link, VPS Docker + ghcr deploy, pnpm, no Supabase/Hyperdrive/Pages), env vars section (`.env.production` vars), quick commands (`pnpm`, `db:up` now uses `--profile dev`)
- Modify: `.claude/plans/cloudflare-pages-deployment-plan.md`, `.claude/plans/cloudflare-supabase-migration-plan.md`, `.claude/plans/cloudflare-supabase-migration-review.md`, `.claude/plans/cloudflare-workers-db-connection-analysis.md`, `.claude/SESSION-NOTES-2025-12-23.md` — prepend one banner line each: `> **⚠️ HISTORICAL (superseded 2026-07-07):** describes the retired Cloudflare Pages + Hyperdrive + Supabase architecture. Current: VPS-hosted, see docs/plans/2026-07-07-phase2e-vps-hosted-cutover.md.` (Don't delete — they're history, they just must not read as current.)
- Check: any other `.claude/*.md` the Step 2 sweep flags (`CLAUDE-FULL.md`, `CLAUDE-PHASES.md`, `TODO-*.md`) — fix if it reads as current guidance, banner as HISTORICAL if it's a record.
- Delete (⛔ **gitignored — ask Werner first, his data-loss rule**): `.wrangler/`, `dist/`, `.dev.vars`, `.dev.vars.sh` from the working tree

**Step 1: Make the edits above.**

**Step 2: Verification sweep — the whole point of this task**

```bash
grep -rni "wrangler\|hyperdrive\|pages_build\|dev.vars" \
  --include="*.ts" --include="*.vue" --include="*.js" --include="*.json" \
  --include="*.toml" --include="*.md" --include="*.example" . \
  | grep -v node_modules | grep -v "\.nuxt" \
  | grep -v "\.claude/plans/" | grep -v "docs/plans/" | grep -v "SESSION-NOTES"
```

Expected: **zero hits** — the historical plan folders and the bannered session notes are the only sanctioned mentions (they're excluded by path, since a banner line doesn't stop their body text matching). Also re-run the Task 3 Step 2 grep — still zero.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: purge Cloudflare Pages pipeline breadcrumbs (README, CLAUDE.md, plans banners, gitignore)"
```

---

## Task 7: ⛔ GATE — Werner reviews & pushes the branch

Werner's manual steps (nothing proceeds until done):
1. Review the branch (`git log`, diff at leisure).
2. `git push -u origin migrate/vps-postgres-modern-stack` (his rule: pushes are his call). Merging to `master` can wait until after the cutover is verified.

---

## Task 8: Build the image on the desktop and push to ghcr

**Step 1: Check ghcr login (probably already logged in from ecom builds)**

```bash
docker login ghcr.io   # if it prompts, Werner supplies his GitHub PAT (write:packages)
```

**Step 2: Build + push**

```bash
./scripts/build-push.sh
```

Expected: pushes `ghcr.io/wernervandermerwe/budgeting-app:1.0.0` and `:latest`.

**Step 3 (Werner, one-time):** if the ghcr package is private, confirm the VPS's existing ghcr login can pull it (it pulls ecom already, so the same PAT with `read:packages` should work).

---

## Task 9: VPS — clone repo, env, pull & run

All over `ssh vps`. Read `/root/VPS-GUIDE.md` first if anything looks different than described.

**Step 1: Verify the shared-network facts the compose file assumes**

```bash
ssh vps 'docker network ls; docker inspect infra-postgres --format "{{json .NetworkSettings.Networks}}" | head -c 400; free -m | head -2'
```

Expected: a network named `postgres_default` (or similar — if different, fix `docker-compose.yml`'s `networks.infra.name`, commit, have Werner push, re-pull). Note the container's network **aliases** — `DATABASE_URL` host must match one (likely `postgres` and/or `infra-postgres`). Also sanity-check free RAM (≥ ~500 MB before adding the app).

**Step 2: Clone + env**

```bash
ssh vps 'mkdir -p /root/apps && cd /root/apps && git clone -b migrate/vps-postgres-modern-stack https://github.com/WernervanderMerwe/budgeting-app-nuxt.git budgeting-app'
ssh vps 'cd /root/apps/budgeting-app && cp .env.production.example .env.production'
```

(the repo is public — anonymous clone works, no git auth needed on the VPS)

Then fill `.env.production` on the VPS: DB password from `/root/infra/postgres/.env`, fresh `BETTER_AUTH_SECRET` (`openssl rand -base64 32` — do NOT reuse the local dev secret), the real `RESEND_API_KEY` (Werner provides or it's in local `.env.local` — confirm with him before copying a secret across machines).

**Step 3: Confirm schema is current (it should no-op)**

```bash
ssh -fN -L 5544:127.0.0.1:5544 vps
DATABASE_URL='postgresql://budgeting:<pw>@127.0.0.1:5544/budgeting' \
DIRECT_URL='postgresql://budgeting:<pw>@127.0.0.1:5544/budgeting' \
  npx prisma migrate deploy
```

Expected: "No pending migrations to apply." (16 tables already live.)
(`prisma.config.ts` requires BOTH via `env()`; it also dotenv-loads `.env.local`, but dotenv never overrides already-set vars, so the inline values win.)

**Step 4: Pull + start**

```bash
ssh vps 'cd /root/apps/budgeting-app && bash scripts/vps-pull.sh'
ssh vps 'sleep 3; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3200/login; docker logs --tail 10 budgeting-app'
```

Expected: `200`, clean logs. If the app can't resolve the DB host, revisit Step 1's aliases.

---

## Task 10: VPS — nginx + DNS

**Step 1: Verify the existing Origin Cert covers the subdomain**

```bash
ssh vps 'openssl x509 -in /etc/ssl/cloudflare/cert.pem -noout -ext subjectAltName'
```

Expected: contains `*.wernerbuildsapps.co.za`. If NOT: ⛔ Werner creates an Origin Cert for `budget.wernerbuildsapps.co.za` in the dashboard (SSL/TLS → Origin Server) and we save it as a separate pem/key pair, adjusting the conf paths.

**Step 2: Install the nginx site**

```bash
ssh vps 'cp /root/apps/budgeting-app/deploy/nginx/budgeting-app.conf /etc/nginx/sites-available/ && ln -sf /etc/nginx/sites-available/budgeting-app.conf /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx'
```

Expected: `nginx -t` OK, reload clean.

**Step 3: DNS A record (via the API token in `.env.local`, which has DNS write on the zone)**

Create `budget.wernerbuildsapps.co.za` → `169.239.181.75`, **proxied: true**, zone `3c1ad23b25b17f15d0c22ef37c100975`:

```bash
TOKEN=$(grep '^CLOUDFLARE_API_TOKEN' .env.local | cut -d= -f2- | tr -d '"'"'"' \r')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/3c1ad23b25b17f15d0c22ef37c100975/dns_records" \
  -d '{"type":"A","name":"budget","content":"169.239.181.75","proxied":true}'
```

Expected: `"success":true`.

If it returns an auth error instead (token lacks DNS write), Werner adds the record in the dashboard: `budget` → `169.239.181.75`, Proxy ON.

**Step 4: Verify end-to-end reachability**

```bash
curl -s -o /dev/null -w "%{http_code}" https://budget.wernerbuildsapps.co.za/login
```

Expected: `200` (allow a minute for DNS/proxy propagation).

---

## Task 11: ⛔ GATE — Werner smoke-tests before we call it live

Werner clicks through on the real domain (this is the "confirm before prod" rule — old Pages prod is untouched and remains the fallback):

1. `https://budget.wernerbuildsapps.co.za` → redirected to `/login`.
2. Request magic link → email arrives from `send.wernerbuildsapps.co.za` → click → signed in.
3. Profile row exists in the VPS DB (I verify: `ssh vps 'docker exec infra-postgres psql -U budgeting -d budgeting -c "select id, profile_token, created_at from budgeting.profiles;"'`).
4. Transaction mode + Yearly mode both load; create one test entry in each; hard-refresh; still there; no console errors.

Only after Werner says it looks good → Task 12.

---

## Task 12: Post-cutover cleanup (each item ASK FIRST — destructive/irreversible)

1. **Remove the now-unused DB tunnel path** (frees VPS RAM): delete the `budget-db.wernerbuildsapps.co.za` published route + DNS CNAME; stop/remove the `cloudflared` service from `/root/infra/postgres` compose if it has no other routes.
2. **Delete the old Hyperdrive config** `budgeting-db` (`0588de2028054413a9f8d7dba56bbbe5`) — it still points at Supabase and nothing uses it.
3. **Retire the Cloudflare Pages project** `budgeting-app` — only after the VPS deploy has been stable for a while (it's the rollback until then).
4. **Decommission the Supabase Cloud project** — irreversible, Werner's explicit call, separate sit-down.
5. Clean `.env.local` (⛔ gitignored — ask first): drop the commented-out Supabase `DATABASE_URL`/`DIRECT_URL` values and the unused `SUPABASE_URL`/`SUPABASE_KEY`. Keep `CLOUDFLARE_API_TOKEN` — still used for DNS on the zone.
6. **Final no-breadcrumbs check, both sides:** re-run the Task 6b grep sweep on the repo (still zero), and on the Cloudflare account confirm nothing budgeting-related remains: `hyperdrive/configs` empty of `budgeting-db`, no Pages project, no `budget-db` DNS record or tunnel route. A future VPS move must find nothing pointing at the old pipeline.
7. Werner merges the branch to `master` and pushes; VPS repo switches to master (`git -C /root/apps/budgeting-app checkout master && git pull`).
8. Reminder owed (memory): nightly `pg_dump` backups for infra-postgres (+ tutoring) with offsite copy — raise as its own task; the VPS still has **no backups**.

## Rollback

At any point before Task 12: the old Cloudflare Pages + Supabase Cloud prod is untouched and keeps working. VPS-side steps are additive (new container, new nginx site, new DNS name). To back out: remove the nginx site + DNS A record + container; nothing else changed.
