# Budgeting App - Nuxt 3

Personal budgeting app with transaction tracking and yearly overview modes.

## Tech Stack
- **Framework:** Nuxt 3 + Vue 3 + TypeScript
- **Styling:** TailwindCSS + dark mode
- **Database:** PostgreSQL + Prisma ORM (via Supabase)
- **Auth:** Supabase Auth
- **Deployment:** Cloudflare Pages with Hyperdrive
- **Dates:** dayjs (unix timestamps in DB)

## Quick Commands
```bash
npm run dev              # Start dev server
npm run build            # Production build
npx prisma studio        # DB GUI
npx prisma migrate dev   # Create migration (local)
npx prisma migrate deploy # Apply migrations (prod)
npm run cleanup          # Kill leftover node processes
```

## Key Conventions
- **Money:** Stored in cents (divide by 100 for display)
- **Dates:** Unix timestamps (seconds) - use dayjs
- **API:** RESTful endpoints in `server/api/`
- **State:** Vue composables (no Vuex/Pinia)
- **Auth:** profileToken links data to user accounts

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
```

## Database Models
**Transaction Mode:** TransactionMonth, TransactionFixedPayment, TransactionCategory, TransactionEntry
**Yearly Mode:** YearlyBudget, YearlyIncomeSource, YearlyIncomeEntry, YearlyDeduction, YearlySection, YearlyCategory, YearlyCategoryEntry

## Environment Variables
```env
DATABASE_URL          # Supabase pooler connection (with ?pgbouncer=true)
DIRECT_URL            # Direct Supabase connection (for migrations)
NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_KEY
```

## Current Status
- Core app complete and deployed to Cloudflare Pages
- Authentication working via Supabase
- Both Transaction and Yearly modes functional

## References
- User guide: `docs/user-guide.md`
- Build history: `.claude/CLAUDE-PHASES.md`
- Full guide: `.claude/CLAUDE-FULL.md`

---

**Note:** Always use Context7 MCP for library docs, code generation, and bug fixes.