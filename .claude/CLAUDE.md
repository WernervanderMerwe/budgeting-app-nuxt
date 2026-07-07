# Budgeting App - Nuxt 4

Personal budgeting app with transaction tracking and yearly overview modes.

## Tech Stack
- **Framework:** Nuxt 4 + Vue 3 + TypeScript
- **Styling:** TailwindCSS + dark mode
- **Database:** PostgreSQL + Prisma 7 (driver adapters), shared `infra-postgres` on the VPS
- **Auth:** better-auth magic-link (Resend mailer)
- **Deployment:** VPS-hosted Docker — image built locally, pushed to `ghcr.io/wernervandermerwe/budgeting-app`, pulled on the VPS via `scripts/vps-pull.sh`, compose `production` profile, port `127.0.0.1:3200`, Nginx + Cloudflare Origin Cert at `budget.wernerbuildsapps.co.za`
- **Package manager:** pnpm 10.26.2
- **Dates:** dayjs (unix timestamps in DB)

## Quick Commands
```bash
pnpm dev                  # Start dev server
pnpm build                # Production build
pnpm db:up                # Start local dev Postgres (docker compose --profile dev up -d)
pnpm db:down              # Stop local dev Postgres
npx prisma studio         # DB GUI
npx prisma migrate dev    # Create migration (local)
npx prisma migrate deploy # Apply migrations (prod — run from desktop over SSH port-forward, see deploy/README.md)
pnpm cleanup              # Kill leftover node processes
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
BETTER_AUTH_SECRET    # openssl rand -base64 32
BETTER_AUTH_URL       # App's public origin, no trailing slash
RESEND_API_KEY        # Magic-link email delivery
RESEND_FROM           # e.g. "Budget App <noreply@send.wernerbuildsapps.co.za>"
```
See `.env.example` (local dev) and `.env.production.example` (VPS).

## Current Status
- VPS cutover in progress on branch `migrate/vps-postgres-modern-stack` (retiring the old Cloudflare Pages + edge-DB-binding + Supabase pipeline, onto VPS Docker + ghcr + shared infra-postgres + better-auth)
- The Cloudflare Pages production deployment is legacy and stays live only as a fallback until the VPS cutover is verified end-to-end, then it gets decommissioned
- Both Transaction and Yearly modes functional

## VPS Cutover
- **Plan:** `docs/plans/2026-07-07-phase2e-vps-hosted-cutover.md`
- **Deploy procedure:** `deploy/README.md`

## Pending Review TODOs
Review these files before implementing improvements:
- `.claude/TODO-POSTGRESQL-REVIEW.md` - FK indexes, data type considerations
- `.claude/TODO-API-DESIGN-REVIEW.md` - Status codes, error response format
- `.claude/TODO-ERROR-HANDLING-REVIEW.md` - Zod validation errors, error extraction

## References
- User guide: `docs/user-guide.md`
- Build history: `.claude/CLAUDE-PHASES.md`
- Full guide: `.claude/CLAUDE-FULL.md`

---
