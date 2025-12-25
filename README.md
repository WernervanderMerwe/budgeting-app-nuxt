# Budgeting App

Personal budgeting application with two modes: **Transaction Tracker** for monthly expense tracking and **Yearly Overview** for annual planning with the 70/20/10 budgeting method.

## Features

- **Transaction Mode** - Monthly income, fixed payments, budget categories, and transaction tracking
- **Yearly Mode** - 12-month planning grid with income sources, deductions, and budget sections
- **70/20/10 Budgeting** - Built-in sections for Needs (70%), Wants (20%), and Savings (10%)
- **Dark/Light Mode** - System preference detection with manual toggle
- **Authentication** - Secure user accounts via Supabase Auth
- **Mobile Responsive** - Works on desktop and mobile devices

## Tech Stack

- **Framework:** Nuxt 3 + Vue 3 + TypeScript
- **Styling:** TailwindCSS (via @nuxt/ui)
- **Database:** PostgreSQL + Prisma ORM
- **Backend:** Supabase (database + auth)
- **Deployment:** Cloudflare Pages with Hyperdrive

## Quick Start

### Prerequisites

- Node.js 20.9+
- [Supabase](https://supabase.com) account (free tier works)
- [Cloudflare](https://cloudflare.com) account (for deployment)

### 1. Clone and Install

```bash
git clone https://github.com/WernervanderMerwe/budgeting-app-nuxt.git
cd budgeting-app-nuxt
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Go to **Settings > Database** and note your connection strings
3. Create a Hyperdrive config in Cloudflare pointing to your Supabase database

### 3. Environment Variables

Create `.env.local` in the project root:

```env
# Database (Supabase connection via pooler)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true"

# Direct connection (for migrations only)
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Supabase client
NUXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NUXT_PUBLIC_SUPABASE_KEY="your-anon-key"
```

### 4. Run Migrations

```bash
npx prisma migrate deploy
```

### 5. Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## Production Deployment

### Cloudflare Pages

```bash
# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name=budgeting-app
```

### Environment Variables (Cloudflare Dashboard)

Set these in your Cloudflare Pages project settings:
- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_KEY`

The `DATABASE_URL` is provided automatically by Hyperdrive binding.

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
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create new migration
npm run cleanup          # Kill orphaned node processes (Windows)
```

## License

MIT
