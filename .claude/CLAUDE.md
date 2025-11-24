# Budgeting App - Nuxt 3 Rebuild Guide

**Quick Reference Guide** - For detailed instructions, see [CLAUDE-FULL.md](./CLAUDE-FULL.md)

## Overview

Migration of Angular 17 budgeting app to Nuxt 3 with TailwindCSS, SQLite, and Prisma ORM.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, TailwindCSS, SQLite, Prisma ORM

---

## 🎯 Current Project Status

**Progress:** Phase 6 Complete (96% Complete) | **Current Phase:** Phase 7 - Testing & Refinement

### Completed Phases:
- ✅ **Phase 1:** Project Foundation (Nuxt 3, TailwindCSS, TypeScript)
- ✅ **Phase 2:** Database & Backend Setup (Prisma, SQLite, 5 models)
- ✅ **Phase 3:** Server API Routes (15 RESTful endpoints)
- ✅ **Phase 4:** TypeScript Types & Composables (3 composables, complete type system)
- ✅ **Phase 5:** Utility Functions (Currency, Date utilities)
- ✅ **Phase 6:** UI Components (9 components + layout + main page)

### Current Phase:
- 🔄 **Phase 7:** Testing & Refinement (Ready to start)

### Remaining Phases:
- ⏳ **Phase 8:** Enhancement Ideas (Future features)
- ⏳ **Deployment:** Build and deploy

### Implementation Summary:
- **Total Files Implemented:** 39 core application files
- **API Endpoints:** 15 RESTful endpoints
- **Components:** 9 Vue components + 1 layout
- **Composables:** 3 state management composables
- **Database:** SQLite with Prisma ORM, 5 models, 2 migrations applied

### Recent Git Commits:
- `7031687` - fix vibe coded dependency mess
- `e58f920` - phase 6 complete (Tailwind/Vite compatibility resolved)
- `78b8461` - Complete Phase 5: Utility Functions & Helpers with dayjs Integration
- `e914df7` - Complete Phase 4: TypeScript Types & Composables
- `5573f8a` - Complete Phase 3: Server API Routes + Phase 2 cleanup

### Next Steps:
1. Run development server: `npm run dev`
2. Test all features (Month Management, Fixed Payments, Categories, Transactions)
3. Verify dark mode functionality
4. Address any bugs or UX issues
5. Optional: Migrate data from old Angular app

---

## Phase 1: Project Foundation ✅ COMPLETE

**Goal:** Initialize Nuxt 3 project and configure core dependencies

- **Step 1:** Initialize Nuxt 3 Project → [Details](./CLAUDE-FULL.md#step-1-initialize-nuxt-3-project)
- **Step 2:** Install Core Dependencies → [Details](./CLAUDE-FULL.md#step-2-install-core-dependencies)
- **Step 3:** Configure Nuxt → [Details](./CLAUDE-FULL.md#step-3-configure-nuxt)
- **Step 4:** Configure TailwindCSS → [Details](./CLAUDE-FULL.md#step-4-configure-tailwindcss)
- **Step 5:** TypeScript Configuration → [Details](./CLAUDE-FULL.md#step-5-typescript-configuration)

---

## Phase 2: Database & Backend Setup ✅ COMPLETE

**Goal:** Set up SQLite database with Prisma ORM and authentication-ready schema

- **Step 6:** Initialize Prisma → [Details](./CLAUDE-FULL.md#step-6-initialize-prisma)
- **Step 7:** Create Prisma Schema → [Details](./CLAUDE-FULL.md#step-7-create-prisma-schema)
  - User, Month, FixedPayment, BudgetCategory, Transaction models
- **Step 8:** Generate Prisma Client → [Details](./CLAUDE-FULL.md#step-8-generate-prisma-client)
- **Step 9:** Create Database Utility → [Details](./CLAUDE-FULL.md#step-9-create-database-utility)
- **Step 10:** Create Database Seeding Script → [Details](./CLAUDE-FULL.md#step-10-create-database-seeding-script)

---

## Phase 3: Server API Routes ✅ COMPLETE

**Goal:** Create RESTful API endpoints for all CRUD operations

### Helper Functions
- **Step 11:** Create Helper Functions → [Details](./CLAUDE-FULL.md#step-11-create-helper-functions)
  - `server/utils/currency.ts` - Currency conversion utilities
  - `server/utils/validation.ts` - Zod validation schemas

### API Endpoints
- **Step 12:** Month API Routes → [Details](./CLAUDE-FULL.md#step-12-month-api-routes)
  - GET `/api/months` - List all months
  - POST `/api/months` - Create month
  - GET `/api/months/[id]` - Get month with relations
  - PATCH `/api/months/[id]` - Update month
  - DELETE `/api/months/[id]` - Delete month

- **Step 13:** Fixed Payments API Routes → [Details](./CLAUDE-FULL.md#step-13-fixed-payments-api-routes)
  - POST `/api/fixed-payments`
  - PATCH `/api/fixed-payments/[id]`
  - DELETE `/api/fixed-payments/[id]`

- **Step 14:** Budget Categories API Routes → [Details](./CLAUDE-FULL.md#step-14-budget-categories-api-routes)
  - POST `/api/categories`
  - PATCH `/api/categories/[id]`
  - DELETE `/api/categories/[id]`

- **Step 15:** Transactions API Routes → [Details](./CLAUDE-FULL.md#step-15-transactions-api-routes)
  - POST `/api/transactions`
  - PATCH `/api/transactions/[id]`
  - DELETE `/api/transactions/[id]`

- **Step 16:** Summary Calculation Endpoint → [Details](./CLAUDE-FULL.md#step-16-summary-calculation-endpoint)
  - GET `/api/months/[id]/summary` - Calculate all budget totals

---

## Phase 4: TypeScript Types & Composables ✅ COMPLETE

**Goal:** Create type-safe interfaces and Vue composables for state management

- **Step 17:** Create TypeScript Types → [Details](./CLAUDE-FULL.md#step-17-create-typescript-types)
  - `types/budget.ts` - All interfaces and DTOs

- **Step 18:** Create useMonths Composable → [Details](./CLAUDE-FULL.md#step-18-create-usemonths-composable)
  - Month CRUD operations
  - State management for months

- **Step 19:** Create useBudget Composable → [Details](./CLAUDE-FULL.md#step-19-create-usebudget-composable)
  - Fixed payments, categories, transactions CRUD
  - Summary fetching

- **Step 20:** Create useTheme Composable → [Details](./CLAUDE-FULL.md#step-20-create-usetheme-composable)
  - Dark mode toggle and persistence

---

## Phase 5: Utility Functions & Helpers ✅ COMPLETE

**Goal:** Create reusable utility functions for common operations

- **Step 21:** Create Currency Utility (Client-side) → [Details](./CLAUDE-FULL.md#step-21-create-currency-utility-client-side)
  - `utils/currency.ts` - Format and parse currency

- **Step 22:** Create Date Utility → [Details](./CLAUDE-FULL.md#step-22-create-date-utility)
  - `utils/date.ts` - Date formatting and validation

---

## Phase 6: UI Components ✅ COMPLETE

**Goal:** Build modular, reusable Vue components with TailwindCSS

### Layout & Core
- **Step 23:** App Layout → [Details](./CLAUDE-FULL.md#step-23-app-layout)
- **Step 24:** AppHeader Component → [Details](./CLAUDE-FULL.md#step-24-appheader-component)
- **Step 25:** MonthSidebar Component → [Details](./CLAUDE-FULL.md#step-25-monthsidebar-component)
- **Step 26:** LoadingSpinner Component → [Details](./CLAUDE-FULL.md#step-26-loadingspinner-component)
- **Step 27:** ErrorAlert Component → [Details](./CLAUDE-FULL.md#step-27-erroralert-component)

### Budget Components
- **Step 28:** IncomeCard Component → [Details](./CLAUDE-FULL.md#step-28-incomecard-component)
- **Step 29:** FixedPaymentsList Component → [Details](./CLAUDE-FULL.md#step-29-fixedpaymentslist-component)
- **Step 30:** BudgetCategoryCard Component → [Details](./CLAUDE-FULL.md#step-30-budgetcategorycard-component)
- **Step 31:** TransactionList Component → [Details](./CLAUDE-FULL.md#step-31-transactionlist-component)
- **Step 32:** BudgetSummaryCard Component → [Details](./CLAUDE-FULL.md#step-32-budgetsummarycard-component)

### Main Page
- **Step 33:** Main Page → [Details](./CLAUDE-FULL.md#step-33-main-page)
  - `pages/index.vue` - Main application page

---

## Phase 7: Testing & Refinement 🔄 CURRENT PHASE

**Goal:** Test all features and ensure proper functionality

- **Step 34:** Run Development Server → [Details](./CLAUDE-FULL.md#step-34-run-development-server)
- **Step 35:** Test All Features → [Details](./CLAUDE-FULL.md#step-35-test-all-features)
  - Month Management
  - Fixed Payments
  - Budget Categories
  - Transactions
  - Calculations
  - Dark Mode

- **Step 36:** Database Migration (Optional) → [Details](./CLAUDE-FULL.md#step-36-database-migration-optional)
  - Migrate data from old Angular app

---

## Phase 8: Enhancement Ideas (Future) ⏳ PLANNED

**Goal:** Plan for future enhancements

- **Step 37:** Additional Features → [Details](./CLAUDE-FULL.md#step-37-additional-features)
  - Month templates
  - Drag-and-drop reordering
  - Data export (CSV/Excel)
  - Charts and visualizations
  - Authentication
  - Mobile app (PWA/Capacitor)

---

## Deployment ⏳ PLANNED

**Goal:** Build and deploy the application

- **Step 38:** Build for Production → [Details](./CLAUDE-FULL.md#step-38-build-for-production)
- **Step 39:** Deployment Options → [Details](./CLAUDE-FULL.md#step-39-deployment-options)
  - Vercel (Recommended)
  - Netlify
  - Self-hosted
  - Static hosting

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Database
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Create and apply migration
npx prisma db seed             # Seed database
npx prisma studio              # Open Prisma Studio GUI

# Deployment
vercel                         # Deploy to Vercel
netlify deploy                 # Deploy to Netlify
```

---

## Project Structure

```
budgeting-app-nuxt/
├── server/
│   ├── api/                   # API routes
│   │   ├── months/
│   │   ├── fixed-payments/
│   │   ├── categories/
│   │   └── transactions/
│   └── utils/                 # Server utilities
│       ├── db.ts
│       ├── currency.ts
│       └── validation.ts
├── components/                # Vue components
├── composables/               # Vue composables
├── pages/                     # Route pages
├── types/                     # TypeScript types
├── utils/                     # Client utilities
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── assets/
│   └── css/
│       └── main.css
└── nuxt.config.ts
```

---

## Key Design Decisions

- **Monetary values in cents**: Avoids floating-point precision issues
- **User model**: Authentication-ready but not enforced (userId nullable)
- **Cascade deletes**: Automatic cleanup of related records
- **Composables for state**: Vue 3 composables instead of Vuex/Pinia
- **Dark mode with class strategy**: TailwindCSS class-based dark mode
- **Type-safety throughout**: TypeScript strict mode enabled

---

For complete step-by-step instructions, code examples, and detailed explanations, refer to [CLAUDE-FULL.md](./CLAUDE-FULL.md).

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation, bug fixes. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.
