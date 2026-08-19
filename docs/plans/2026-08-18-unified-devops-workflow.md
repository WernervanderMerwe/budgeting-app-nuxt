# Unified DevOps Workflow (budgeting + ecom → tutoring spec) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retrofit `budgeting-app-nuxt` and `ecommerce-template` to the tutoring three-tier dev lifecycle AND the tutoring mail stack, so every project has identical muscle memory (`pnpm dev:up` → `pnpm qa:up` → `pnpm vps:deploy`, work on `dev`, deploy from `main`) and identical libraries for the same problems (one fix propagates everywhere).

**Architecture:** Tutoring (`~/projects/online-tutoring-app`, branch `feat/pg16-better-auth` working tree) is the source of truth — its `scripts/`, `docker-compose.yml` qa profile, `ci.yml`, `server/utils/mail.ts`, and `docs/devops/lifecycle.md` get copied into both repos with only per-app constants changed (image name, container names, ports, VPS path). Budgeting additionally renames `master`→`main`, gains eslint + Mailpit, and swaps the Resend HTTP SDK for nodemailer→Resend-SMTP. Ecom drops the `nuxt-nodemailer` module for the shared transport, keeping its `FailedEmail` retry queue as an app-level wrapper. Budgeting keeps two deliberate differences: Prisma **migrations** (not `db push`) and the **shared `infra-postgres`** prod DB.

**Tech Stack:** bash scripts, docker compose profiles, GitHub Actions (lint+typecheck only), pnpm, GHCR, nodemailer + Mailpit (dev) / Resend SMTP gateway (prod).

**Tracking:** bead `online-tutoring-app-y5b` (created 2026-07-12) — close it when this plan completes.

---

## Status: EXECUTED 2026-08-19 — awaiting Werner's review + merge

| Phase | State |
|---|---|
| **A — budgeting** | DONE, merged to `main` (`01f5197`), pushed. Not yet deployed — version bump + `pnpm vps:deploy` deliberately deferred to the next feature work. |
| **B — ecom** | DONE on local `dev` (`1ebdfaf`), **not pushed** — Werner pushes. `lint`, `typecheck` and a full production build all green (build needs `NODE_OPTIONS=--max-old-space-size=8192`, same as the Dockerfile). |
| **T — tutoring** | DONE (`75042ad` on `feat/pg16-better-auth`). All three `server/utils/mail.ts` copies now byte-identical except the per-app `from` fallback. |
| **C — wrap-up** | Bead updated; memory updated. Bead stays open until both `dev` branches merge. |

**Dual-zod risk (carried over from tutoring's production 500s): CLEARED for ecom.**
`.output/server/node_modules/zod` symlinks to `zod@3.25.76`, with `zod@4.3.6` traced separately
under `.nitro/` for better-auth. `nitro.externals.inline: ['zod']` is not needed here.

**Found during execution — pre-existing, not caused by this plan:** ecom's VPS
`.env.production` has an **empty `SMTP_HOST`**, and the removed `nuxt-nodemailer` config read
that same variable. Ecom production email has therefore never been configured. Real SMTP
credentials are needed before any ecom transactional mail works in production; until then sends
fail soft into the `FailedEmail` queue.

---

## Per-app constants (the ONLY allowed differences in copied files)

| | tutoring (reference) | ecommerce-template | budgeting-app-nuxt |
|---|---|---|---|
| GHCR image | `sa-tutoring-platform` | `ecom-template` | `budgeting-app` |
| VPS app dir | `~/apps/tutoring/repo` | `/root/apps/ecommerce-template` | `/root/apps/budgeting-app` |
| Prod container | `tutoring-app` | `ecommerce-app` | `budgeting-app` |
| Dev PG container / port | `tutoring-postgres-dev` / 5435 | `ecommerce-postgres-dev` / 5433 | `budgeting-postgres-dev` / 5434 |
| Dev PG user/pass/db | tutoring | ecommerce / ecommerce_dev | budgeting / budgeting_dev |
| qa container / port | `tutoring-qa` / 3420 | `ecommerce-qa` / **3421** | `budgeting-qa` / **3422** |
| Mailpit UI / SMTP | 8026 / 1026 | 8025 / 1025 | **8027 / 1027** (new) |
| Prod SMTP from | no-reply@tutoring.… | per ecom config | `Budget App <noreply@send.wernerbuildsapps.co.za>` |
| Schema workflow | `db push` | `db push` | **`prisma migrate`** |
| Prod DB | own PG16 container | own PG16 container | shared `infra-postgres` |

## Canonical mail stack (unified)

- **Transport:** tutoring's `server/utils/mail.ts` — bare `nodemailer`, lazy singleton, `NUXT_SMTP_HOST/PORT/USER/PASS/FROM` env vars, fail-soft `sendMail()` that never throws, plus `escapeHtml()`. Copied **byte-identical** into all three repos.
- **One additive change to the canonical file:** `MailResult` gains `error?: string` (set from the caught error in the fail path). Ecom's retry queue needs the error text; tutoring's existing callers only read `.sent`, so nothing breaks. Applied to all three copies — including tutoring's (Phase T, needs Werner's OK since that branch is pre-cutover).
- **Dev/qa:** SMTP → local Mailpit (no auth). **Prod:** SMTP → `smtp.resend.com:587`, user `resend`, pass = the Resend API key. Same Resend account, same emails — just via SMTP so every repo shares one mail library.
- **App-level policy stays app-level:** ecom's `FailedEmail` queue + retry cron wrap the shared transport (`if (!result.sent) queue(result.error)`); budgeting's magic-link callback throws on `!result.sent` so a failed login email stays visible to the user (a silently-dropped magic link is an outage that looks like nothing — known tutoring failure mode).

## Deviations from "propagate everything as is" (flagged per Werner's request)

1. **Budgeting keeps `prisma migrate`**, tutoring/ecom use `db push`. Budgeting has real migration files and prod migrations run from the desktop over an SSH tunnel (runtime image has no Prisma CLI). New script `vps-db.sh migrate` wraps that tunnel dance so the command shape (`pnpm vps:db:migrate`) still matches tutoring.
2. **qa ports differ per app** (3420/3421/3422), Mailpit ports too (8026/8025/8027) — so all three stacks can run simultaneously; same reasoning as the existing dev-PG port split.
3. **Budgeting `vps-deploy.sh` does not run migrations.** It prints a reminder when `prisma/migrations` changed since the last deploy tag.
4. **`.env` vs `.env.local`:** tutoring & ecom use `.env` as the dev env file; budgeting uses `.env.local` (wired into `nuxt.config.ts` + `prisma.config.ts`). This plan unifies budgeting onto `.env`. The actual file rename is a **Werner manual step** (gitignored file — data-loss rule).
5. **Ecom keeps its `FailedEmail` retry queue** on top of the shared mail transport — commerce emails (order confirmations, PayFast notifies) deserve durability that a fail-soft log line doesn't give. Not propagated to the other apps (YAGNI for magic links).
6. **CI is lint+typecheck only** (as on tutoring). No deploy-on-push anywhere; deploys stay local via `pnpm vps:deploy`.

## Canonical package.json script set (target state in BOTH repos)

```jsonc
"dev": "fuser -k 3000/tcp 2>/dev/null; nuxt dev",        // budgeting keeps its `prisma generate &&` prefix
"dev:kill": "fuser -k 3000/tcp",
"dev:up": "bash scripts/dev-up.sh",
"dev:down": "bash scripts/dev-down.sh",
"lint": "eslint .",
"typecheck": "nuxt typecheck",
"db:up": "docker compose --profile dev up -d",
"db:down": "docker compose --profile dev down",
"db:push": "prisma db push",
"db:seed": "tsx prisma/seed.ts",
"db:studio": "prisma studio",
"qa:up": "docker compose --profile qa up -d --build",
"qa:down": "docker compose --profile qa down",
"qa:logs": "docker compose --profile qa logs -f",
"docker:push": "bash scripts/build-push.sh",
"vps:deploy": "bash scripts/vps-deploy.sh",
"vps:logs": "ssh vps 'docker logs -f <prod-container>'",
"vps:status": "ssh vps 'docker ps | grep <app-grep>'",
"version:patch": "bash scripts/version-bump.sh patch",
"version:minor": "bash scripts/version-bump.sh minor",
"version:major": "bash scripts/version-bump.sh major"
```
Budgeting-only additions: `"db:migrate": "prisma migrate dev"`, `"db:reset": "prisma migrate reset --force"`, `"vps:db:migrate": "bash scripts/vps-db.sh migrate"`.
Ecom-only keeps: `"db:reset": "prisma db push --force-reset && tsx prisma/seed.ts"`, `"db:fts"`, `"db:studio"` (its existing port-5555 form is fine).

---

# Phase A — budgeting-app-nuxt

Work from `/home/bullzeye/projects/budgeting-app-nuxt`. Reference files come from `/home/bullzeye/projects/online-tutoring-app` (leave that repo untouched except Phase T).

### Task A1: Rename `master` → `main` (GitHub + local + VPS)

**Files:** none (git/GitHub state)

**Step 1: Rename on GitHub** (retargets default branch, open PRs, and branch protection automatically)

```bash
gh api -X POST repos/WernervanderMerwe/budgeting-app-nuxt/branches/master/rename -f new_name=main
```
Expected: JSON response with `"name": "main"`.

**Step 2: Rename locally and fix tracking**

```bash
git branch -m master main
git fetch origin
git branch -u origin/main main
git remote set-head origin -a
```
Verify: `git status -sb` → `## main...origin/main` with no divergence.

**Step 3: Delete the stale `migrate/vps-postgres-modern-stack` branch — only if fully merged**

```bash
git branch --contains migrate/vps-postgres-modern-stack | grep main
```
If `main` is listed (it should be — `master` was ahead of it):
```bash
git branch -d migrate/vps-postgres-modern-stack
git push origin --delete migrate/vps-postgres-modern-stack
```
If NOT listed: **stop and ask Werner** before deleting.

**Step 4: Switch the VPS checkout to main**

```bash
ssh vps 'cd /root/apps/budgeting-app && git fetch origin && git checkout main && git pull origin main && git remote set-head origin -a && git branch --list "migrate/*" | xargs -r git branch -D'
```
Verify: `ssh vps 'cd /root/apps/budgeting-app && git status -sb | head -1'` → `## main...origin/main`.
(This only moves the checkout — the running container is from a GHCR image and is untouched.)

### Task A2: Create `dev` branch

```bash
git switch -c dev
git push -u origin dev
```
All remaining Phase A tasks are committed on `dev`.

### Task A3: docker-compose — rename dev service, add Mailpit + qa profile

**Files:** Modify: `docker-compose.yml`

**Step 1:** Rename the dev service key `postgres:` → `postgres-dev:` (container name already `budgeting-postgres-dev`; the named volume `pgdata-dev` is keyed by project+volume name, so **data is preserved**).

**Step 2:** Add Mailpit to the dev profile (ports offset from ecom/tutoring):

```yaml
  mailpit:
    image: axllent/mailpit:latest
    container_name: budgeting-mailpit
    profiles: ["dev"]
    ports:
      - "8027:8025"   # web UI (8025 ecom, 8026 tutoring)
      - "1027:1025"   # SMTP
```

**Step 3:** Add the qa service:

```yaml
  # ── QA (local prod-image gate) ──────────────────────────
  budgeting-qa:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: budgeting-qa
    profiles: ["qa"]
    restart: "no"
    network_mode: host   # reach dev Postgres on localhost:5434 + Mailpit on 1027; browser + SSR share localhost
    env_file:
      - .env.qa
```

**Step 4: Verify**

```bash
docker compose --profile dev config --quiet && docker compose --profile qa config --quiet && echo OK
```
Expected: `OK` (qa config requires `.env.qa` to exist — create an empty one first if validating before Task A4, then delete it).

**Step 5: Commit** — `feat(devops): rename dev pg service, add mailpit + qa compose profile`

### Task A4: `.env.qa.example` + gitignore

**Files:** Create: `.env.qa.example` — Modify: `.gitignore`

**Step 1:** Create `.env.qa.example`:

```bash
# QA tier — production Docker image against the LOCAL dev Postgres + Mailpit.
# Prereq: pnpm db:up   |   Setup: cp .env.qa.example .env.qa (fill secrets)
# network_mode: host — localhost works for both SSR and browser.

PORT=3422

DATABASE_URL="postgresql://budgeting:budgeting_dev@localhost:5434/budgeting"
DIRECT_URL="postgresql://budgeting:budgeting_dev@localhost:5434/budgeting"

BETTER_AUTH_SECRET=""            # openssl rand -base64 32 — per-tier, never reuse prod's
BETTER_AUTH_URL="http://localhost:3422"

# Mail → local Mailpit (read at http://localhost:8027); no auth needed
NUXT_SMTP_HOST="localhost"
NUXT_SMTP_PORT="1027"
NUXT_SMTP_USER=""
NUXT_SMTP_PASS=""
NUXT_SMTP_FROM="Budget App <noreply@send.wernerbuildsapps.co.za>"
```

**Step 2:** Append to `.gitignore`: `.env.qa`

**Step 3: Verify** `git check-ignore .env.qa` prints `.env.qa`.

**Step 4: Commit** — `feat(devops): qa env template`

### Task A5: Unify dev env file `.env.local` → `.env`

**Files:** Modify: `nuxt.config.ts:1-4`, `prisma.config.ts:1-5`, `.env.example`, `.gitignore`

**Step 1:** In `nuxt.config.ts` and `prisma.config.ts`, delete the explicit dotenv loading (`import { config } from 'dotenv'` + `config({ path: '.env.local' })`). Nuxt loads `.env` natively; Prisma 7's `prisma.config.ts` keeps dotenv but points at `.env`:
```ts
config({ path: ".env" });
```
(Prisma CLI does not auto-load `.env` when a `prisma.config.ts` exists — keep dotenv there, only change the path.)

**Step 2:** `.env.example` header: change "Copy to .env.local" → "Copy to .env". Ensure `.gitignore` covers `.env` (check: `git check-ignore .env`). (The SMTP var swap in `.env.example` happens in Task A6.)

**Step 3:** ⚠️ **Werner manual step (gitignored data):** `cp .env.local .env` (keep `.env.local` until dev verified, then delete it himself).

**Step 4: Verify** after Werner's copy: `pnpm db:up && pnpm dev` boots and connects to Postgres. Kill it after.

**Step 5: Commit** — `feat(devops): dev env file is .env (unified with ecom/tutoring)`

### Task A6: Unify mail stack — Resend SDK → shared nodemailer transport

**Files:** Create: `server/utils/mail.ts` — Rewrite: `server/utils/mailer.ts` — Modify: `server/lib/auth.ts`, `.env.example`, `.env.production.example`, `package.json` (deps)

**Step 1: Swap dependencies**

```bash
pnpm remove resend
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

**Step 2:** Copy tutoring's `server/utils/mail.ts` **verbatim**, then apply the one canonical extension (same in all repos):
- `MailResult` → `{ sent: boolean; error?: string }`
- in the catch/fail paths, return `{ sent: false, error: String(err) }` (and `{ sent: false, error: 'NUXT_SMTP_HOST not set' }` when unconfigured)
- change the default `from` fallback to `'Budget App <noreply@send.wernerbuildsapps.co.za>'`

**Step 3:** Rewrite `server/utils/mailer.ts` — keep the exported `sendMagicLinkEmail(event, { to, url })` signature and the existing HTML template (green button etc.), but send via the shared transport:

```ts
import { sendMail } from './mail'

export async function sendMagicLinkEmail(_event: H3Event, opts: { to: string; url: string }) {
  const html = /* existing template, unchanged */
  const result = await sendMail({ to: opts.to, subject: 'Sign in to Budget App', html })
  if (!result.sent) {
    // Magic-link mail MUST fail loud — a silent drop is an invisible login outage
    throw new Error(`Failed to send magic link email: ${result.error}`)
  }
}
```
`server/lib/auth.ts` needs no change (it already awaits `sendMagicLinkEmail`, and better-auth surfaces the throw to the sign-in request).

**Step 4:** Env templates — replace the Resend block in both:

`.env.example` (dev → Mailpit):
```bash
# Mail — dev goes to local Mailpit (pnpm db:up; read at http://localhost:8027)
NUXT_SMTP_HOST="localhost"
NUXT_SMTP_PORT="1027"
NUXT_SMTP_USER=""
NUXT_SMTP_PASS=""
NUXT_SMTP_FROM="Budget App <noreply@send.wernerbuildsapps.co.za>"
```

`.env.production.example` (prod → Resend SMTP gateway, same Resend account as before):
```bash
# Mail — Resend SMTP gateway (user is literally "resend", pass is the Resend API key)
NUXT_SMTP_HOST="smtp.resend.com"
NUXT_SMTP_PORT="587"
NUXT_SMTP_USER="resend"
NUXT_SMTP_PASS=""                # Resend API key (was RESEND_API_KEY)
NUXT_SMTP_FROM="Budget App <noreply@send.wernerbuildsapps.co.za>"
```
Remove `RESEND_API_KEY` / `RESEND_FROM` from both templates. Sweep for stragglers: `grep -rn RESEND_ --include='*.ts' --include='*.md' .` → update `.claude/CLAUDE.md` env-var table too (or defer to Task A11).

**Step 5:** ⚠️ **Werner manual step:** add the `NUXT_SMTP_*` block (pass = current `RESEND_API_KEY` value) to the VPS's `/root/apps/budgeting-app/.env.production` — keep the old `RESEND_*` lines until the first new-image deploy succeeds, then delete them.

**Step 6: Verify** `pnpm dev` → request a magic link on the login page → email appears in Mailpit at http://localhost:8027, link logs you in.

**Step 7: Commit** — `feat(mail): unified nodemailer transport (Mailpit dev / Resend SMTP prod), drop resend SDK`

### Task A7: Copy + adapt scripts

**Files:** Create: `scripts/dev-up.sh`, `scripts/dev-down.sh`, `scripts/vps-deploy.sh`, `scripts/vps-db.sh`, `scripts/version-bump.sh` (straight copy) — Keep: `scripts/build-push.sh`, `scripts/vps-pull.sh` (already match the ecom/tutoring pattern)

**Step 1:** Copy from tutoring, then apply ONLY these edits:

- `dev-up.sh`: container check → `docker exec budgeting-postgres-dev pg_isready -U budgeting -q`
- `dev-down.sh`: straight copy (it shells out to `pnpm dev:kill` / `pnpm db:down`)
- `version-bump.sh`: straight copy (repo-agnostic)
- `vps-deploy.sh`: `IMAGE="ghcr.io/wernervandermerwe/budgeting-app"`, `APP_DIR="/root/apps/budgeting-app"`. Add after the version-bump check (deviation #3):

```bash
# --- 4b. Warn if migrations changed since the last release tag ---
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ] && [ -n "$(git diff --name-only "$LAST_TAG"..HEAD -- prisma/migrations/)" ]; then
    echo -e "${YELLOW}⚠️  prisma/migrations changed since $LAST_TAG.${NC}"
    echo -e "   Run ${YELLOW}pnpm vps:db:migrate${NC} after (or before) this deploy."
fi
```

- `scripts/vps-db.sh` (new, budgeting-specific — wraps the documented tunnel flow from `deploy/README.md`):

```bash
#!/bin/bash
# vps-db.sh migrate — run prisma migrate deploy against the VPS infra-postgres
# over an SSH port-forward (the runtime image has no Prisma CLI).
set -e
[ "$1" = "migrate" ] || { echo "Usage: $0 migrate"; exit 1; }

read -s -p "budgeting DB password (VPS /root/infra/postgres/.env): " PW; echo
ssh -fN -L 5544:127.0.0.1:5544 vps
trap 'ssh -O cancel -L 5544:127.0.0.1:5544 vps 2>/dev/null || true' EXIT

DATABASE_URL="postgresql://budgeting:${PW}@127.0.0.1:5544/budgeting" \
DIRECT_URL="postgresql://budgeting:${PW}@127.0.0.1:5544/budgeting" \
npx prisma migrate deploy
```

**Step 2:** `chmod +x scripts/*.sh` and verify the executable bit is tracked (`git ls-files -s scripts/ | grep 100755` — this repo had a filemode incident before, commit 9301ff3).

**Step 3: Verify** `bash -n` each new script (syntax check) → no output.

**Step 4: Commit** — `feat(devops): tutoring-spec lifecycle scripts (dev-up/down, vps-deploy, vps-db, version-bump)`

### Task A8: package.json script overhaul

**Files:** Modify: `package.json`

**Step 1:** Apply the canonical script set (top of this plan), budgeting flavor:
- `"dev": "fuser -k 3000/tcp 2>/dev/null; prisma generate && nuxt dev"` (keeps its generate step)
- Add: `dev:up`, `dev:down`, `db:push`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`, `qa:up/down/logs`, `docker:push`, `vps:deploy`, `vps:logs` (`budgeting-app`), `vps:status` (grep `budgeting`), `vps:db:migrate`, `version:*`, `lint`, `typecheck`
- **Delete:** `windows:cleanup`, `windows:cleanup:all`, `prisma:dev`, `prisma:prod`, `cleanup` (superseded by `dev:kill`)

**Step 2: Verify** `node -e "JSON.parse(require('fs').readFileSync('package.json'))" && pnpm run` (lists scripts without error).

**Step 3: Commit** — `feat(devops): canonical script set, drop windows/prisma cruft`

### Task A9: Add eslint + typecheck

**Files:** Modify: `package.json`, `nuxt.config.ts` — Create: `eslint.config.mjs`

**Step 1:** `pnpm add -D eslint @nuxt/eslint` (versions will land ≥ tutoring's `eslint ^9.39.2`, `@nuxt/eslint ^1.12.1`).

**Step 2:** Add `@nuxt/eslint` to `modules` in `nuxt.config.ts`. Copy tutoring's `eslint.config.mjs` verbatim (the `vue/html-closing-bracket-newline` rule set).

**Step 3:** `pnpm lint` — expect a pile of first-run errors. Run `pnpm lint --fix`, then fix the remainder by hand. **Do not change runtime behavior to satisfy a rule** — if a rule demands a logic change, disable the rule for that line with a comment instead.

**Step 4:** `pnpm typecheck` (vue-tsc already installed). Fix real type errors; same rule — no behavior changes.

**Step 5: Verify** both exit 0. **Step 6: Commit** — `feat(devops): eslint (@nuxt/eslint, tutoring config) + typecheck green`

### Task A10: CI workflow

**Files:** Create: `.github/workflows/ci.yml`

Copy tutoring's `ci.yml` with one edit — budgeting's Prisma generate needs both URLs:

```yaml
      - name: Generate Prisma client
        run: DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm prisma generate
```

Verify after push (Task A12): green run at `https://github.com/WernervanderMerwe/budgeting-app-nuxt/actions`.
Commit — `feat(devops): CI lint+typecheck on main/dev`

### Task A11: Docs

**Files:** Create: `docs/devops/lifecycle.md` — Modify: `deploy/README.md`, `.claude/CLAUDE.md`

- `docs/devops/lifecycle.md`: adapt tutoring's (three tiers, budgeting ports/commands, `prisma migrate` + `vps:db:migrate` instead of db push, shared infra-postgres note, dev/qa email → Mailpit :8027, deploy flow: `version:patch` → `qa:up` gate → merge dev→main → `vps:deploy`).
- `deploy/README.md`: replace the manual build-push/ssh/pull "Pipeline" section with `pnpm vps:deploy` (+ rollback `pnpm vps:deploy <tag>`); Migrations section now points at `pnpm vps:db:migrate`.
- `.claude/CLAUDE.md`: Quick Commands → `dev:up`, `qa:up`, `vps:deploy`, `vps:db:migrate`; env-var table `RESEND_*` → `NUXT_SMTP_*`; Tech-Stack auth line "Resend mailer" → "nodemailer (Mailpit dev / Resend SMTP prod)"; note branches dev/main; update "Current Status".

Commit — `docs: unified lifecycle + mail docs`

### Task A12: End-to-end verification (the qa gate proving itself)

1. `pnpm db:up` → `pnpm dev:up` boots, Ctrl+C, `pnpm dev:down` stops containers.
2. Dev magic-link: request sign-in link → arrives in Mailpit (http://localhost:8027) → login works.
3. `cp .env.qa.example .env.qa`, fill `BETTER_AUTH_SECRET` (fresh); `pnpm qa:up` → builds image, container `budgeting-qa` up; `curl -s -o /dev/null -w '%{http_code}' http://localhost:3422/` → `200`. Magic-link login via Mailpit again (qa shares the dev DB + Mailpit). Click around both Transaction and Yearly modes. `pnpm qa:down`.
4. `git push origin dev` → CI green.
5. **STOP — Werner reviews on dev** (his rule: never deploy without dev confirmation). No merge to main, no `vps:deploy` in this plan; first real deploy happens with the upcoming feature work. **Reminder for that deploy:** it ships the Resend-SDK→SMTP swap — Werner's VPS env edit (Task A6 Step 5) must land first, and prod magic-link must be browser-verified right after.

---

# Phase B — ecommerce-template

Work from `/home/bullzeye/projects/ecommerce-template`. Already on `main` with `version:*`, `build-push.sh`, `vps-pull.sh`, lint/typecheck; no CI, no qa tier, no dev branch.

### Task B1: `dev` branch
```bash
git switch -c dev && git push -u origin dev
```

### Task B2: dev scripts
**Files:** Modify: `package.json` — Create: `scripts/dev-up.sh`, `scripts/dev-down.sh`

- `"dev": "fuser -k 3000/tcp 2>/dev/null; nuxt dev"`, add `"dev:kill"`, `"dev:up"`, `"dev:down"`.
- Copy `dev-up.sh`/`dev-down.sh`; adapt check → `docker exec ecommerce-postgres-dev pg_isready -U ecommerce -q`.
- Note: ecom's `db:up`/`db:down` currently target only `postgres-dev` — widen to the whole dev profile (`docker compose --profile dev up -d` / `down`) so Mailpit starts too, matching tutoring.

Verify: `bash -n scripts/dev-*.sh`. Commit — `feat(devops): dev:up/dev:down one-shots, port-kill in dev`

### Task B3: qa profile
**Files:** Modify: `docker-compose.yml`, `.gitignore` — Create: `.env.qa.example`

```yaml
  ecommerce-qa:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ecommerce-qa
    profiles: ["qa"]
    restart: "no"
    network_mode: host
    env_file:
      - .env.qa
```

`.env.qa.example`: `PORT=3421`, `DATABASE_URL=postgresql://ecommerce:ecommerce_dev@localhost:5433/ecommerce`, auth/origin vars mirroring `.env.production.example` but localhost:3421, and `NUXT_SMTP_HOST=localhost` / `NUXT_SMTP_PORT=1025` (Mailpit). No uploads volume in qa — uploaded files vanish on `qa:down`, acceptable for a gate.
Add `qa:up/down/logs` scripts. Gitignore `.env.qa`.
Verify: `docker compose --profile qa config --quiet`. Commit — `feat(devops): qa compose profile + env template`

### Task B4: Unify mail stack — drop `nuxt-nodemailer`, shared transport, keep retry queue

**Files:** Create: `server/utils/mail.ts` — Rewrite: `server/utils/mailer.ts` — Modify: `nuxt.config.ts`, `package.json` (deps), `.env.example`, `.env.production.example` — Sweep: `server/api/cron/retry-emails.post.ts`, `server/api/payments/payfast/notify.post.ts`, `server/api/orders/[id].patch.ts`, `server/lib/auth.ts`

**Step 1:** `pnpm remove nuxt-nodemailer` (keep `nodemailer`; `pnpm add -D @types/nodemailer` if absent). Remove `'nuxt-nodemailer'` from `modules` and the whole `nodemailer:` config block from `nuxt.config.ts`.

**Step 2:** Copy the canonical `server/utils/mail.ts` (same file as budgeting Task A6 Step 2, `MailResult.error` included; `from` fallback per ecom's config).

**Step 3:** Rewrite ecom's `sendMail` wrapper in `server/utils/mailer.ts` to use the shared transport but keep the queue semantics:

```ts
import { sendMail as transportSend } from './mail'

export async function sendMail({ to, subject, html, text, replyTo }: {...}) {
  const result = await transportSend({ to, subject, html, text, replyTo })
  if (!result.sent) {
    await prisma.failedEmail.create({
      data: { to, subject, html, text: text ?? null, error: result.error ?? 'unknown', attempts: 1 }
    })
    console.error(`[MAIL] Failed to send to ${to}, queued for retry: ${result.error}`)
  }
  return result
}
```
(If the canonical `mail.ts` lacks `replyTo`/`text` in `MailOptions`, extend `MailOptions` — additive, propagate the same shape to all three copies.)

**Step 4:** Sweep the four caller files for direct `useNodeMailer()` usage — anything found switches to the wrapper (or `transportSend` where queueing is wrong, e.g. the retry cron itself must NOT re-queue: on `!sent` it just increments `attempts`).

**Step 5:** Env var rename `SMTP_*` → `NUXT_SMTP_*` in `.env.example` + `.env.production.example`. Sweep: `grep -rn 'SMTP_' --include='*.ts' --include='*.example' . | grep -v NUXT_SMTP` → zero hits.
⚠️ **Werner manual step:** rename the vars in local `.env` / `.env.production` (gitignored) and in the VPS's `/root/apps/ecommerce-template/.env.production` — coordinate with the next ecom deploy (old image reads `SMTP_*` via the removed module config, new image reads `NUXT_SMTP_*`; keep both blocks until the deploy lands).

**Step 6: Verify** `pnpm dev:up` → trigger any email flow (e.g. auth verification) → lands in Mailpit :8025; `pnpm typecheck` green.

**Step 7: Commit** — `feat(mail): shared nodemailer transport, drop nuxt-nodemailer module; retry queue kept`

### Task B5: Harden `version-bump.sh`
Replace with tutoring's (adds: clean-tree check, origin-sync check, tag-collision check on origin, `--follow-tags` push). Straight copy — it's repo-agnostic.
Verify: `bash -n`. Commit — `feat(devops): hardened version-bump (sync + tag-collision gates)`

### Task B6: `vps-deploy.sh` + script renames
**Files:** Create: `scripts/vps-deploy.sh` — Modify: `package.json`

- Copy tutoring's `vps-deploy.sh`; set `IMAGE="ghcr.io/wernervandermerwe/ecom-template"`, `APP_DIR="/root/apps/ecommerce-template"`.
- `package.json`: rename `"docker:build"` → `"docker:push"`; add `"vps:deploy"`, `"vps:logs": "ssh vps 'docker logs -f ecommerce-app'"`, `"vps:status": "ssh vps 'docker ps | grep ecommerce'"`. Keep `"vps:pull"` (harmless; runs on the VPS side).

Verify: `bash -n scripts/vps-deploy.sh && pnpm run | grep vps`. Commit — `feat(devops): unified vps:deploy (main+bump gates, GHCR, rollback tag)`

### Task B7: CI
Copy tutoring's `ci.yml` unchanged (ecom's Prisma generate needs `DATABASE_URL` only — check its prisma config/schema for a directUrl var and add it if present).
Commit — `feat(devops): CI lint+typecheck on main/dev`

### Task B8: Docs
- `deploy/README.md`: fix stale `/opt/ecommerce-template` → `/root/apps/ecommerce-template` (verified live checkout 2026-08-18); replace two-step pipeline with `pnpm vps:deploy`.
- Create `docs/devops/lifecycle.md` (ecom flavor: ports 3000/5433/8025/3421/3100, db push workflow, mail via shared transport).
- Update ecom's `.claude/CLAUDE.md` quick commands / env-var docs if present.

Commit — `docs: unified lifecycle + mail docs`

### Task B9: Verification
1. `pnpm dev:up` boots (needs ecom `.env` valid — Werner's B4 var rename done), Ctrl+C, `pnpm dev:down`.
2. Email flow lands in Mailpit :8025 (covered in B4 Step 6 — re-check here if B4 predates the env rename).
3. `cp .env.qa.example .env.qa` + fill; `pnpm qa:up`; `curl -s -o /dev/null -w '%{http_code}' http://localhost:3421/` → `200`; browse briefly; `pnpm qa:down`.
4. `git push origin dev` → CI green. **STOP — Werner reviews.** No merge/deploy in this plan. **Reminder for the next ecom deploy:** it ships the `SMTP_*`→`NUXT_SMTP_*` switch — VPS env edit must land first; verify a real transactional email after.

---

# Phase T — tutoring (one file, needs Werner's explicit OK)

`server/utils/mail.ts` on `feat/pg16-better-auth`: add `error?: string` to `MailResult` and populate it in the fail paths (+ `replyTo`/`text` in `MailOptions` if added in B4). Nothing else on that branch is touched — it's pre-cutover (PG16 Phases 7–8 pending). If Werner prefers zero churn there, defer this to the branch's Phase 9 cleanup and accept the three copies differing by those lines until then. Commit — `feat(mail): MailResult.error for cross-app parity (unification plan, budgeting repo)`

# Phase C — Wrap-up

1. **Bead:** `cd ~/projects/online-tutoring-app && bd update online-tutoring-app-y5b --notes "budgeting + ecom retrofitted (lifecycle + mail stack) on their dev branches, plan docs/plans/2026-08-18-unified-devops-workflow.md (budgeting repo); pending Werner review + first deploys"` — close (`bd close`) only after Werner merges both dev branches.
2. **Memory:** update budgeting auto-memory (workflow + mail unified; master→main done; qa=3422, Mailpit=8027) and note in tutoring memory that y5b is executed-pending-review.
3. **Note:** tutoring's own lifecycle spec still lives on unmerged `feat/pg16-better-auth`; the PG16 cutover (Phases 7–8, Werner) is a separate outstanding item.

## Werner's manual steps (collected)

1. **A5:** `cp .env.local .env` in budgeting (then delete `.env.local` once dev verified).
2. **A6:** add `NUXT_SMTP_*` block to budgeting's VPS `.env.production` (pass = current Resend API key); delete `RESEND_*` lines after the first new-image deploy succeeds.
3. **B4:** rename `SMTP_*` → `NUXT_SMTP_*` in ecom's local `.env`/`.env.production` and the VPS `.env.production` (keep both blocks until the next ecom deploy lands).
4. **T:** approve (or defer) the one-file `mail.ts` touch on tutoring's pre-cutover branch.
5. **A12/B9:** click-test both qa builds (magic-link via Mailpit on :3422, ecom on :3421) and review both `dev` branches.
6. **After merge:** first `pnpm vps:deploy` from each repo (budgeting's will warn about the version-bump commit the very first time — bump with `pnpm version:patch` first). Browser-verify prod email flows immediately after each (mail transport changed!).
