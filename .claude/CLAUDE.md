# Budgeting App - Nuxt 4

Personal budgeting app with transaction tracking and yearly overview modes.

## Tech Stack
- **Framework:** Nuxt 4 + Vue 3 + TypeScript
- **Styling:** TailwindCSS + dark mode
- **Database:** PostgreSQL + Prisma 7 (driver adapters), shared `infra-postgres` on the VPS
- **Auth:** better-auth magic-link (nodemailer — Mailpit in dev, Resend SMTP gateway in prod)
- **Deployment:** VPS-hosted Docker — image built locally via `pnpm vps:deploy`, pushed to `ghcr.io/wernervandermerwe/budgeting-app`, pulled on the VPS, compose `production` profile, port `127.0.0.1:3200`, Nginx + Cloudflare Origin Cert at `budget.wernerbuildsapps.co.za`
- **Package manager:** pnpm 10.26.2
- **Dates:** dayjs (unix timestamps in DB)

## Branches & Workflow
Work on `dev`; deploy only from `main` via `pnpm vps:deploy`. The `pnpm qa:up` gate is
mandatory before merging `dev` → `main` — see `docs/devops/lifecycle.md`.

## Quick Commands
```bash
pnpm dev:up                # Start local dev stack (Postgres + Mailpit + Nuxt, foreground)
pnpm dev:down              # Stop local dev stack
pnpm qa:up                 # Build + start prod-image QA container (port 3422)
pnpm qa:down               # Stop QA container
pnpm db:migrate            # Create + apply a migration (local, prisma migrate dev)
pnpm vps:deploy            # Build, push to GHCR, deploy to VPS (gates: on main, clean, synced, version-bumped)
pnpm vps:db:migrate        # Apply migrations to prod DB (SSH tunnel + prisma migrate deploy)
pnpm version:patch         # Bump version + tag (also :minor / :major)
pnpm db:studio             # DB GUI (or: npx prisma studio)
pnpm dev:kill              # Free port 3000 (kill leftover Nuxt dev process)
```

## Key Conventions
- **Money:** Stored in cents (divide by 100 for display)
- **Dates:** Unix timestamps (seconds) - use dayjs
- **API:** RESTful endpoints in `server/api/`
- **State:** Vue composables (no Vuex/Pinia)
- **Auth:** better-auth magic-link session; profileToken links data to user accounts

## Project Structure
```
server/api/           # API endpoints
  months/             # Transaction mode
  yearly/             # Yearly overview mode
  categories/, fixed-payments/, transactions/
components/           # Vue components
  yearly/             # Yearly-specific components
composables/          # State composables
pages/                # Route pages
  transaction/        # /transaction/[year]/[month]
  yearly/             # /yearly/[year]
prisma/schema.prisma  # Database models
deploy/               # VPS deploy docs, Nginx config
scripts/              # build-push.sh (desktop), vps-pull.sh (VPS)
```

## Database Models
**Transaction Mode:** TransactionMonth, TransactionFixedPayment, TransactionCategory, TransactionEntry
**Yearly Mode:** YearlyBudget, YearlyIncomeSource, YearlyIncomeEntry, YearlyDeduction, YearlySection, YearlyCategory, YearlyCategoryEntry

## Environment Variables
```env
DATABASE_URL          # Postgres connection (local: docker compose; prod: infra-postgres on VPS)
DIRECT_URL            # Direct connection, migrations only
BETTER_AUTH_SECRET    # openssl rand -base64 32, per-tier
BETTER_AUTH_URL       # App's public origin, no trailing slash — must match browser origin per tier
NUXT_SMTP_HOST        # dev/qa: localhost (Mailpit) | prod: smtp.resend.com
NUXT_SMTP_PORT        # dev/qa: 1027 | prod: 587
NUXT_SMTP_USER        # prod: "resend" (literally); unset in dev/qa
NUXT_SMTP_PASS        # prod: Resend API key; unset in dev/qa
NUXT_SMTP_FROM        # e.g. "Budget App <noreply@send.wernerbuildsapps.co.za>"
```
One file per tier: `.env` (dev), `.env.qa` (qa), `.env.production` (VPS; mirror changes to
`.env.production.example`). All gitignored. See `docs/devops/lifecycle.md` for the full rules
(including the fail-soft/fail-loud mail behavior).

## Current Status
- 2026-08-18: devops unified to the `online-tutoring-app` three-tier lifecycle spec (dev/qa/production, `master`→`main` rename done) — see `docs/devops/lifecycle.md`
- LIVE on the VPS since 2026-07-08 at `https://budget.wernerbuildsapps.co.za` (cutover complete; old Cloudflare Pages project and Hyperdrive config deleted)
- Nightly pg_dump backups of infra-postgres at 02:00 (`/root/backups/` on the VPS, 14-day retention)
- Both Transaction and Yearly modes functional; low-maintenance mode — no heavy development planned

## VPS Cutover
- **Plan:** `docs/plans/2026-07-07-phase2e-vps-hosted-cutover.md`
- **Deploy procedure:** `deploy/README.md`

## Pending Review TODOs
Review these files before implementing improvements:
- `.claude/TODO-POSTGRESQL-REVIEW.md` - FK indexes, data type considerations
- `.claude/TODO-API-DESIGN-REVIEW.md` - Status codes, error response format
- `.claude/TODO-ERROR-HANDLING-REVIEW.md` - Zod validation errors, error extraction

## References
- Dev/QA/production lifecycle: `docs/devops/lifecycle.md`
- User guide: `docs/user-guide.md`
- Build history: `.claude/CLAUDE-PHASES.md`
- Full guide: `.claude/CLAUDE-FULL.md`

---
