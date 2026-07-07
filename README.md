# Budgeting App

Personal budgeting application with two modes: **Transaction Tracker** for monthly expense tracking and **Yearly Overview** for annual planning with the 70/20/10 budgeting method.

## Features

- **Transaction Mode** - Monthly income, fixed payments, budget categories, and transaction tracking
- **Yearly Mode** - 12-month planning grid with income sources, deductions, and budget sections
- **70/20/10 Budgeting** - Built-in sections for Needs (70%), Wants (20%), and Savings (10%)
- **Dark/Light Mode** - System preference detection with manual toggle
- **Authentication** - Secure magic-link accounts via better-auth (Resend mailer)
- **Mobile Responsive** - Works on desktop and mobile devices

## Tech Stack

- **Framework:** Nuxt 4 + Vue 3 + TypeScript
- **Styling:** TailwindCSS (via @nuxt/ui)
- **Database:** PostgreSQL + Prisma 7 (driver adapters)
- **Auth:** better-auth (magic-link, Resend mailer)
- **Deployment:** VPS-hosted Docker (image built locally, pushed to ghcr.io, pulled on the VPS) behind Nginx + Cloudflare Origin Cert

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

### 2. Start the Dev Database

```bash
pnpm db:up   # docker compose --profile dev up -d
```

### 3. Environment Variables

Create `.env.local` in the project root (see `.env.example`):

```env
# Local dev Postgres (from pnpm db:up)
DATABASE_URL="postgresql://budgeting:budgeting_dev@localhost:5434/budgeting"
DIRECT_URL="postgresql://budgeting:budgeting_dev@localhost:5434/budgeting"

# better-auth (magic-link)
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"

# Resend — magic-link email delivery
RESEND_API_KEY=""
RESEND_FROM="Budget App <noreply@send.wernerbuildsapps.co.za>"
```

### 4. Run Migrations

```bash
npx prisma migrate deploy
```

### 5. Development

```bash
pnpm dev
```

Visit `http://localhost:3000`

## Production Deployment

The app deploys to a VPS as a Docker container (Nginx + Cloudflare Origin Cert in front,
shared `infra-postgres` for the database). See [`deploy/README.md`](./deploy/README.md)
for the full procedure (build/push script, `scripts/vps-pull.sh`, migrations, Nginx config).

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
pnpm dev                 # Start dev server
pnpm build               # Production build
pnpm preview             # Preview production build
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create new migration
pnpm db:up               # Start local dev Postgres (docker compose)
pnpm db:down             # Stop local dev Postgres
pnpm cleanup             # Kill orphaned node processes
```

## License

MIT
