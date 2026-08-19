# Budgeting App

Personal budgeting application with two modes: **Transaction Tracker** for monthly expense tracking and **Yearly Overview** for annual planning with the 70/20/10 budgeting method.

## Features

- **Transaction Mode** - Monthly income, fixed payments, budget categories, and transaction tracking
- **Yearly Mode** - 12-month planning grid with income sources, deductions, and budget sections
- **70/20/10 Budgeting** - Built-in sections for Needs (70%), Wants (20%), and Savings (10%)
- **Dark/Light Mode** - System preference detection with manual toggle
- **Authentication** - Secure magic-link accounts via better-auth (nodemailer — Mailpit in dev, Resend SMTP gateway in prod)
- **Mobile Responsive** - Works on desktop and mobile devices

## Tech Stack

- **Framework:** Nuxt 4 + Vue 3 + TypeScript
- **Styling:** TailwindCSS (via @nuxt/ui)
- **Database:** PostgreSQL + Prisma 7 (driver adapters)
- **Auth:** better-auth (magic-link, nodemailer — Mailpit in dev, Resend SMTP gateway in prod)
- **Deployment:** VPS-hosted Docker (image built locally via `pnpm vps:deploy`, pushed to ghcr.io, pulled on the VPS) behind Nginx + Cloudflare Origin Cert

## Quick Start

### Prerequisites

- Node.js 20.9+
- pnpm 10.26.2 (`packageManager` in `package.json`)
- Docker (for the local dev Postgres)

### 1. Clone and Install

```bash
git clone https://github.com/WernervanderMerwe/budgeting-app-nuxt.git
cd budgeting-app-nuxt
pnpm install
```

### 2. Environment Variables

Create `.env` in the project root (see `.env.example`):

```env
# Local dev Postgres (from pnpm db:up)
DATABASE_URL="postgresql://budgeting:budgeting_dev@localhost:5434/budgeting"
DIRECT_URL="postgresql://budgeting:budgeting_dev@localhost:5434/budgeting"

# better-auth (magic-link)
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"

# Mail — dev goes to local Mailpit (read at http://localhost:8422)
NUXT_SMTP_HOST="localhost"
NUXT_SMTP_PORT="1422"
NUXT_SMTP_USER=""
NUXT_SMTP_PASS=""
NUXT_SMTP_FROM="Budget App <noreply@send.wernerbuildsapps.co.za>"
```

### 3. Start the Database

```bash
pnpm db:up    # Postgres + Mailpit containers
```

### 4. Run Migrations

```bash
pnpm db:migrate
```

### 5. Start the Dev Stack

```bash
pnpm dev:up   # Postgres + Mailpit containers, then Nuxt dev server (foreground)
```

Visit `http://localhost:3000`. Magic-link sign-in emails land at `http://localhost:8422`
(Mailpit), not a real inbox.

## Production Deployment

The app deploys to a VPS as a Docker container (Nginx + Cloudflare Origin Cert in front,
shared `infra-postgres` for the database) via a single `pnpm vps:deploy` command, gated by a
local QA stage (`pnpm qa:up`) against the same production Docker image. See
[`deploy/README.md`](./deploy/README.md) and [`docs/devops/lifecycle.md`](./docs/devops/lifecycle.md)
for the full dev → qa → production procedure (migrations, Nginx config, rollback).

Production env vars live in `.env.production` on the VPS (see `.env.production.example`).

## Project Structure

```
├── components/          # Vue components
│   └── yearly/          # Yearly mode components
├── composables/         # Vue composables (state management)
├── pages/               # Route pages
│   ├── transaction/     # /transaction/[year]/[month]
│   └── yearly/          # /yearly/[year]
├── server/api/          # API endpoints (Nitro)
├── prisma/              # Database schema and migrations
└── docs/                # Documentation
```

## Documentation

- [User Guide](./docs/user-guide.md) - How to use the app
- [Development Notes](./.claude/CLAUDE.md) - Technical reference

## Scripts

```bash
pnpm dev:up               # Start local dev stack (Postgres + Mailpit + Nuxt, foreground)
pnpm dev:down             # Stop local dev stack
pnpm build                # Production build
pnpm preview              # Preview production build
pnpm db:studio            # Database GUI
pnpm db:migrate           # Create + apply a migration (local)
pnpm qa:up                # Build + start prod-image QA container (port 3422) — deploy gate
pnpm vps:deploy           # Build, push to GHCR, deploy to VPS
pnpm vps:db:migrate       # Apply migrations to prod DB
pnpm version:patch        # Bump version + tag
pnpm dev:kill             # Free port 3000
```

See [`docs/devops/lifecycle.md`](./docs/devops/lifecycle.md) for the full command reference.

## License

MIT
