# Documentation Plan: User Guide + README Update

## Overview
Create two documentation files:
1. **User Guide** (`docs/user-guide.md`) - For friends/family to learn the app
2. **README.md** - Updated for developers who want to clone/deploy

---

## 1. User Guide (`docs/user-guide.md`)

### Structure
```
# Budget App - User Guide

## Getting Started
- Creating an account
- Logging in
- Choosing a mode (Transaction vs Yearly)

## Transaction Mode
- Creating your first month
- Setting your monthly income
- Adding fixed payments (rent, subscriptions, etc.)
- Creating budget categories
- Adding transactions
- Understanding the budget summary card

## Yearly Overview Mode
- Creating a yearly budget
- Setting up income sources & deductions
- Understanding the 70/20/10 sections
- Adding categories and subcategories
- Tracking paid/unpaid status
- Using Copy Month and Clear Month

## Tips & Tricks
- Dark mode toggle
- Keyboard shortcuts (Enter to save, Escape to cancel)
- Bulk check/uncheck for paid status

## Screenshots
[Placeholder sections for screenshots to be added]
```

### Screenshots to Capture
1. Landing page with mode selection
2. Transaction mode - month view with summary card
3. Transaction mode - adding a transaction
4. Yearly mode - full grid view
5. Yearly mode - income section expanded
6. Dark mode example

---

## 2. README.md Update

### Structure
```
# Budgeting App

Personal budgeting app with two modes: Transaction Tracker and Yearly Overview.

## Features
- Transaction Mode: Monthly income/expense tracking
- Yearly Mode: 12-month planning with 70/20/10 budgeting
- Dark/light mode
- Authentication via Supabase

## Tech Stack
- Nuxt 3 + Vue 3 + TypeScript
- TailwindCSS
- PostgreSQL + Prisma (via Supabase)
- Cloudflare Pages deployment

## Quick Start

### Prerequisites
- Node.js 20.9+
- Supabase account
- Cloudflare account (for deployment)

### Environment Variables
Create `.env.local`:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_KEY="your-anon-key"
```

### Development
```bash
npm install
npm run dev
```

### Production (Cloudflare Pages)
```bash
npm run build
npx wrangler pages deploy dist --project-name=your-app
```

## Project Structure
[Brief overview]

## Documentation
- [User Guide](./docs/user-guide.md)
- [Development Notes](./.claude/CLAUDE.md)
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `docs/user-guide.md` | Create new |
| `README.md` | Update existing |

## Notes
- Screenshots will be captured after user guide text is written
- User guide written for non-technical audience
- README kept concise with essential setup info only
