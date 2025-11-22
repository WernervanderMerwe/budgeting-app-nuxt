# Budgeting App - Nuxt 3

A simple budgeting application built with Nuxt 3, Vue 3, TypeScript, TailwindCSS, SQLite, and Prisma ORM.

## Features

- Monthly income and expense tracking
- Fixed payments management
- Budget categories with transactions
- Real-time budget calculations
- Dark mode support
- Mobile-responsive UI
- Type-safe database operations

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **Styling**: TailwindCSS with dark mode
- **Backend**: Nuxt server API routes (Nitro)
- **Database**: SQLite with Prisma ORM
- **State Management**: Vue 3 composables

## Getting Started

### Prerequisites

- Node.js 20.9+ or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### Development

```bash
# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
budgeting-app-nuxt/
├── server/              # Backend API routes and utilities
├── components/          # Vue components
├── composables/         # Vue composables
├── pages/              # Route pages
├── types/              # TypeScript types
├── utils/              # Client utilities
├── prisma/             # Database schema and migrations
├── assets/css/         # Global styles
└── nuxt.config.ts      # Nuxt configuration
```

## Documentation

- [Quick Reference Guide](./CLAUDE.md)
- [Full Implementation Guide](./CLAUDE-FULL.md)

## License

MIT
