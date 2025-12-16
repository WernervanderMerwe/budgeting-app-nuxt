# Budgeting App - Nuxt 3

Personal budgeting app with transaction tracking and yearly overview modes.

## Tech Stack
- **Framework:** Nuxt 3 + Vue 3 + TypeScript
- **Styling:** TailwindCSS + dark mode
- **Database:** SQLite + Prisma ORM (migrating to Supabase)
- **Dates:** dayjs (unix timestamps in DB)

## Quick Commands
```bash
npm run dev              # Start dev server
npm run build            # Production build
npx prisma studio        # DB GUI
npx prisma migrate dev   # Apply migrations
npm run cleanup          # Kill leftover node processes (Playwright)
```

## Key Conventions
- **Money:** Stored in cents (divide by 100 for display)
- **Dates:** Unix timestamps (seconds) - use dayjs
- **API:** RESTful endpoints in `server/api/`
- **State:** Vue composables (no Vuex/Pinia)

## Project Structure
```
server/api/           # 39 API endpoints
  months/             # Transaction mode
  yearly/             # Yearly overview mode
  categories/, fixed-payments/, transactions/
components/           # 21 Vue components
  yearly/             # Yearly-specific components
composables/          # 9 state composables
pages/                # Route pages
  transaction/        # /transaction/[year]/[month]
  yearly/             # /yearly/[year]
prisma/schema.prisma  # 12 models (Transaction + Yearly modes)
```

## Database Models
**Transaction Mode:** TransactionMonth, TransactionFixedPayment, TransactionCategory, TransactionEntry
**Yearly Mode:** YearlyBudget, YearlyIncomeSource, YearlyIncomeEntry, YearlyDeduction, YearlySection, YearlyCategory, YearlyCategoryEntry

## Current Status
- Core app complete and functional
- Next: Cloudflare Pages + Supabase migration (see `plans/wobbly-humming-stallman.md`)

## References
- Build history: `.claude/CLAUDE-PHASES.md`
- Full guide: `.claude/CLAUDE-FULL.md`
- Migration plan: `~/.claude/plans/wobbly-humming-stallman.md`

---

**Note:** Always use Context7 MCP for library docs, code generation, and bug fixes.
