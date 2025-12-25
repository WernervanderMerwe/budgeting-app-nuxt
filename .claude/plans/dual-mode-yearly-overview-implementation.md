# Budgeting App - Dual Mode Implementation Plan

## Developer Context
- **Background:** Strong frontend (Angular), learning fullstack/Nuxt/backend
- **Work stack:** Angular, MSSQL, Java
- **Project goal:** Learning project + give friends/family access
- **Preferences:** Minimal refactoring, keep things simple while learning

## Overview
Add a "Yearly Overview" mode alongside the existing "Transaction Tracker" mode, with a home landing page for mode selection and proper routing.

## Naming Convention
- **Transaction Tracker** (was "Granular Mode") - Detailed monthly tracking with transactions
- **Yearly Overview** (was "Yearly Mode") - Spreadsheet-style annual view with checkboxes

---

## Phase 1: Routing & Landing Page

### 1.1 Create Landing Page Layout
**File:** `layouts/landing.vue`
- Full-screen centered layout (no sidebar)
- Dark mode support
- Clean, minimal design

### 1.2 Create Home Page
**File:** `pages/index.vue` (replace current content)
- Two mode cards:
  - **Granular Mode**: "Track every transaction in detail" → `/granular`
  - **Yearly Mode**: "View your full year at a glance" → `/yearly`
- Logo/app name at top
- Brief description of each mode

### 1.3 Move Existing Budget View
**File:** `pages/granular.vue` (move from current index.vue)
- Exact same functionality as current index.vue
- Uses existing `default.vue` layout

### 1.4 Create Yearly Page Placeholder
**File:** `pages/yearly.vue`
- Placeholder while we build the full implementation
- Uses new yearly layout

### 1.5 Create Yearly Layout
**File:** `layouts/yearly.vue`
- Header with year selector and navigation back to home
- Full-width content area (no month sidebar)
- Year pagination at bottom

---

## Phase 2: Database Schema for Yearly Mode

### 2.1 New Prisma Models
**File:** `prisma/schema.prisma`

```prisma
// Yearly budget for a specific year
model YearlyBudget {
  id            Int      @id @default(autoincrement())
  userId        Int?     @map("user_id")
  year          Int
  spendTarget   Int      @default(500000) // Target discretionary spend in cents (R5000)
  showWarnings  Boolean  @default(true) @map("show_warnings") // Color warnings toggle
  createdAt     Int      @map("created_at")
  updatedAt     Int      @map("updated_at")

  user          User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  incomeSources YearlyIncomeSource[]
  sections      YearlySection[]

  @@unique([userId, year])
  @@map("yearly_budgets")
}

// Income source (Salary, Side Hustle, etc.)
model YearlyIncomeSource {
  id              Int    @id @default(autoincrement())
  yearlyBudgetId  Int    @map("yearly_budget_id")
  name            String
  orderIndex      Int    @default(0) @map("order_index")
  createdAt       Int    @map("created_at")
  updatedAt       Int    @map("updated_at")

  yearlyBudget    YearlyBudget         @relation(fields: [yearlyBudgetId], references: [id], onDelete: Cascade)
  entries         YearlyIncomeEntry[]

  @@map("yearly_income_sources")
}

// Monthly income entry (gross amount per month)
model YearlyIncomeEntry {
  id              Int    @id @default(autoincrement())
  incomeSourceId  Int    @map("income_source_id")
  month           Int    // 1-12
  grossAmount     Int    @default(0) @map("gross_amount") // In cents
  createdAt       Int    @map("created_at")
  updatedAt       Int    @map("updated_at")

  incomeSource    YearlyIncomeSource   @relation(fields: [incomeSourceId], references: [id], onDelete: Cascade)
  deductions      YearlyDeduction[]

  @@unique([incomeSourceId, month])
  @@map("yearly_income_entries")
}

// Deduction from income (Tax, Pension, etc.)
model YearlyDeduction {
  id              Int    @id @default(autoincrement())
  incomeEntryId   Int    @map("income_entry_id")
  name            String
  amount          Int    @default(0) // In cents
  orderIndex      Int    @default(0) @map("order_index")
  createdAt       Int    @map("created_at")
  updatedAt       Int    @map("updated_at")

  incomeEntry     YearlyIncomeEntry @relation(fields: [incomeEntryId], references: [id], onDelete: Cascade)

  @@map("yearly_deductions")
}

// Budget section (Living Essentials 70%, Non-Essentials 20%, Savings 10%)
model YearlySection {
  id              Int    @id @default(autoincrement())
  yearlyBudgetId  Int    @map("yearly_budget_id")
  type            String // LIVING, NON_ESSENTIAL, SAVINGS
  name            String // Display name
  targetPercent   Int    @default(70) @map("target_percent") // 70, 20, or 10
  orderIndex      Int    @default(0) @map("order_index")
  createdAt       Int    @map("created_at")
  updatedAt       Int    @map("updated_at")

  yearlyBudget    YearlyBudget       @relation(fields: [yearlyBudgetId], references: [id], onDelete: Cascade)
  categories      YearlyCategory[]

  @@map("yearly_sections")
}

// Category within a section (can have parent for 2-level nesting)
model YearlyCategory {
  id              Int    @id @default(autoincrement())
  sectionId       Int    @map("section_id")
  parentId        Int?   @map("parent_id") // For subcategories
  name            String
  orderIndex      Int    @default(0) @map("order_index")
  createdAt       Int    @map("created_at")
  updatedAt       Int    @map("updated_at")

  section         YearlySection        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  parent          YearlyCategory?      @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children        YearlyCategory[]     @relation("CategoryHierarchy")
  entries         YearlyCategoryEntry[]

  @@map("yearly_categories")
}

// Monthly entry for a category (amount + paid status)
model YearlyCategoryEntry {
  id              Int     @id @default(autoincrement())
  categoryId      Int     @map("category_id")
  month           Int     // 1-12
  amount          Int     @default(0) // In cents
  isPaid          Boolean @default(false) @map("is_paid")
  createdAt       Int     @map("created_at")
  updatedAt       Int     @map("updated_at")

  category        YearlyCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, month])
  @@map("yearly_category_entries")
}
```

### 2.2 Update User Model
Add relation to YearlyBudget in existing User model.

### 2.3 Run Migration
```bash
npx prisma migrate dev --name add_yearly_budget_models
```

---

## Phase 3: API Routes for Yearly Mode

### 3.1 Yearly Budget Routes
**Files:**
- `server/api/yearly/index.get.ts` - List yearly budgets
- `server/api/yearly/index.post.ts` - Create yearly budget (with default sections)
- `server/api/yearly/[id].get.ts` - Get budget with all relations
- `server/api/yearly/[id].patch.ts` - Update settings (spendTarget, showWarnings)
- `server/api/yearly/[id].delete.ts` - Delete yearly budget

### 3.2 Income Source Routes
**Files:**
- `server/api/yearly/income-sources/index.post.ts` - Create income source
- `server/api/yearly/income-sources/[id].patch.ts` - Update
- `server/api/yearly/income-sources/[id].delete.ts` - Delete

### 3.3 Income Entry Routes
**Files:**
- `server/api/yearly/income-entries/[id].patch.ts` - Update gross amount
- `server/api/yearly/income-entries/bulk.post.ts` - Bulk create/update for all 12 months

### 3.4 Deduction Routes
**Files:**
- `server/api/yearly/deductions/index.post.ts` - Create deduction
- `server/api/yearly/deductions/[id].patch.ts` - Update
- `server/api/yearly/deductions/[id].delete.ts` - Delete

### 3.5 Category Routes
**Files:**
- `server/api/yearly/categories/index.post.ts` - Create category (with optional parentId)
- `server/api/yearly/categories/[id].patch.ts` - Update
- `server/api/yearly/categories/[id].delete.ts` - Delete

### 3.6 Category Entry Routes
**Files:**
- `server/api/yearly/category-entries/[id].patch.ts` - Update amount or isPaid
- `server/api/yearly/category-entries/bulk.post.ts` - Bulk update for copying months

### 3.7 Summary/Calculation Route
**File:** `server/api/yearly/[id]/summary.get.ts`
- Calculate totals per section per month
- Calculate percentages vs targets
- Calculate monthly leftover

### 3.8 Copy From Previous Month Route
**File:** `server/api/yearly/[id]/copy-month.post.ts`
- Copy all category amounts from one month to another

---

## Phase 4: Composables for Yearly Mode

### 4.1 useYearlyBudget Composable
**File:** `composables/useYearlyBudget.ts`
- State: `yearlyBudgets`, `currentBudget`, `selectedYear`
- Methods: CRUD for yearly budgets
- Methods: `selectYear()`, `fetchBudgetForYear()`

### 4.2 useYearlyIncome Composable
**File:** `composables/useYearlyIncome.ts`
- Methods: CRUD for income sources, entries, deductions
- Computed: `totalGrossPerMonth`, `totalNetPerMonth`, `totalBrutoPerMonth`

### 4.3 useYearlyCategories Composable
**File:** `composables/useYearlyCategories.ts`
- Methods: CRUD for categories and entries
- Methods: `togglePaid()`, `copyFromMonth()`
- Computed: `categoriesBySection`, `sectionTotals`

### 4.4 useYearlySummary Composable
**File:** `composables/useYearlySummary.ts`
- Computed calculations for percentages, totals, warnings
- Methods: `getMonthlyLeftover()`, `getSectionPercentage()`

---

## Phase 5: TypeScript Types

### 5.1 Yearly Budget Types
**File:** `types/yearly.ts`
```typescript
// Enums
export type SectionType = 'LIVING' | 'NON_ESSENTIAL' | 'SAVINGS'

// DTOs
export interface CreateYearlyBudgetDTO { year: number }
export interface UpdateYearlyBudgetDTO { spendTarget?: number; showWarnings?: boolean }
export interface CreateIncomSourceDTO { yearlyBudgetId: number; name: string }
export interface CreateCategoryDTO { sectionId: number; name: string; parentId?: number }
export interface UpdateCategoryEntryDTO { amount?: number; isPaid?: boolean }

// Full models with relations
export interface YearlyBudgetWithRelations { ... }
export interface YearlySectionWithCategories { ... }
export interface YearlyCategoryWithEntries { ... }

// Summary types
export interface YearlySummary { ... }
export interface MonthSummary { ... }
```

---

## Phase 6: UI Components for Yearly Mode

### 6.1 Year Selector Component
**File:** `components/yearly/YearSelector.vue`
- Dropdown or pagination to select year
- Create new year button

### 6.2 Income Section Component
**File:** `components/yearly/IncomeSection.vue`
- Display all income sources
- Add/edit/delete income sources
- Show deductions per source
- Calculate and display total bruto

### 6.3 Income Source Row Component
**File:** `components/yearly/IncomeSourceRow.vue`
- Row with month columns
- Editable gross amounts
- Expandable deductions section
- Shows net amount per month

### 6.4 Budget Section Component
**File:** `components/yearly/BudgetSection.vue`
- Header with section name and target %
- Shows actual % with color coding
- Lists categories

### 6.5 Category Row Component
**File:** `components/yearly/CategoryRow.vue`
- Category name (indented if subcategory)
- 12 month columns with amount + checkbox
- Expandable for subcategories
- Add subcategory button

### 6.6 Month Cell Component
**File:** `components/yearly/MonthCell.vue`
- Editable amount
- Checkbox for paid status
- Visual indicator when paid

### 6.7 Summary Footer Component
**File:** `components/yearly/SummaryFooter.vue`
- Spend target row (editable)
- Monthly leftover row (calculated)
- Difference indicator

### 6.8 Yearly Header Component
**File:** `components/yearly/YearlyHeader.vue`
- App title
- Year selector
- Settings button (toggle warnings)
- Back to home link

### 6.9 Copy Month Modal Component
**File:** `components/yearly/CopyMonthModal.vue`
- Select source month
- Select target month(s)
- Copy amounts (optionally reset paid status)

---

## Phase 7: Yearly Page Implementation

### 7.1 Main Yearly Page
**File:** `pages/yearly.vue`
- Full spreadsheet-style layout
- Horizontal scrolling for months
- Sticky first column (category names)
- Sticky header row (month names)

### 7.2 Page Structure
```
┌──────────────────────────────────────────────────────────┐
│ [Header: Year Selector | Settings | Back to Home]        │
├──────────────────────────────────────────────────────────┤
│ INCOME SECTION                                           │
│ ├─ Salary      [Jan] [Feb] [Mar] ... [Dec]              │
│ │  └─ Tax      [   ] [   ] [   ] ... [   ]              │
│ │  └─ Pension  [   ] [   ] [   ] ... [   ]              │
│ │  = Net       [   ] [   ] [   ] ... [   ]              │
│ └─ Side Income [   ] [   ] [   ] ... [   ]              │
│ = TOTAL BRUTO  [   ] [   ] [   ] ... [   ]              │
├──────────────────────────────────────────────────────────┤
│ LIVING ESSENTIALS (70%) - Actual: 57%                    │
│ ├─ Rent        [   ]☑ [   ]☐ ... [Checkbox per cell]    │
│ ├─ Vehicle     [7700]                                    │
│ │  ├─ Finance  [2100]☑ [2100]☑ ...                      │
│ │  ├─ Insurance[1100]☑ ...                              │
│ │  └─ Fuel     [2000]☐ ...                              │
│ └─ Food        [3500]☑ ...                              │
├──────────────────────────────────────────────────────────┤
│ NON-ESSENTIALS (20%) - Actual: 32% [RED WARNING]         │
│ └─ ...                                                   │
├──────────────────────────────────────────────────────────┤
│ SAVINGS (10%) - Actual: 11%                              │
│ └─ ...                                                   │
├──────────────────────────────────────────────────────────┤
│ SUMMARY                                                  │
│ Spend Target:    [R5,000] [R5,000] ...                   │
│ Monthly Leftover:[R7,511] [R7,200] ... (calculated)      │
├──────────────────────────────────────────────────────────┤
│ [◀ 2024] [2025] [2026 ▶]  Year Pagination                │
└──────────────────────────────────────────────────────────┘
```

---

## Phase 8: User Authentication (Future)

### 8.1 Auth Setup
- Install @sidebase/nuxt-auth or similar
- Configure providers (credentials, OAuth)

### 8.2 Login/Signup Pages
- `pages/auth/login.vue`
- `pages/auth/signup.vue`

### 8.3 Middleware
- `middleware/auth.ts` - Protect routes
- Enforce userId on all API queries

### 8.4 Update API Routes
- Add auth checks to all endpoints
- Filter by authenticated userId

---

## Implementation Order (Phased Approach)

### Phase A: Routing & Landing Page ✅ COMPLETE
**Commit:** `34e2ff8` (Phase A commit in origin/master)
**Goal:** Get navigation working between modes
1. ✅ Create `layouts/landing.vue` - centered, no sidebar
2. ✅ Create new `pages/index.vue` - home with mode selection cards
3. ✅ Move current index.vue content to `pages/granular.vue`
4. ✅ Create `layouts/yearly.vue` - full-width, year header
5. ✅ Create placeholder `pages/yearly.vue` - "Coming soon" message
6. ✅ **TEST:** Navigate between home, granular, and yearly pages

### Phase B: Database Schema ✅ COMPLETE
**Commit:** `493ed0e` Phase B: Add database schema for Yearly Overview mode
**Goal:** Set up data layer for yearly mode
1. ✅ Add 7 new models to `prisma/schema.prisma`
2. ✅ Update User model with YearlyBudget relation
3. ✅ Run migration: `npx prisma migrate dev --name add_yearly_budget_models`
4. ✅ Create seed data for testing
5. ✅ **TEST:** Verify models in Prisma Studio

### Phase C: API Routes ✅ COMPLETE
**Commit:** `8b59da9` Phase C: Add API routes for Yearly Overview mode
**Goal:** Backend CRUD operations
1. ✅ Yearly budget routes (CRUD + summary)
2. ✅ Income source routes
3. ✅ Income entry + deduction routes
4. ✅ Category + entry routes
5. ✅ Copy month endpoint
6. ✅ **TEST:** API calls via REST client or Prisma Studio

### Phase D: Types & Composables ✅ COMPLETE
**Commit:** `72c0003` Phase D: Add TypeScript types and composables for Yearly mode
**Goal:** State management layer
1. ✅ Create `types/yearly.ts`
2. ✅ Create `useYearlyBudget.ts`
3. ✅ Create `useYearlyIncome.ts`
4. ✅ Create `useYearlyCategories.ts`
5. ✅ Create `useYearlySummary.ts`
6. ✅ **TEST:** Log composable state in yearly page

### Phase E: UI Components ✅ COMPLETE
**Commit:** `62f0404` Phase E: Add UI components for Yearly Overview mode
**Goal:** Build reusable yearly mode components
1. ✅ `YearSelector.vue` - year picker
2. ✅ `MonthCell.vue` - amount + checkbox
3. ✅ `CategoryRow.vue` - category with 12 month cells
4. ✅ `BudgetSection.vue` - section header + categories
5. ✅ `IncomeSourceRow.vue` - income with deductions
6. ✅ `IncomeSection.vue` - all income sources
7. ✅ `SummaryFooter.vue` - spend target + leftover
8. ✅ `YearlyHeader.vue` - navigation + settings
9. ✅ `CopyMonthModal.vue` - bulk copy UI
10. ✅ `pages/yearly.vue` - Full page assembled with all components

### Phase F: Testing & Refinement 🔄 NEXT UP
**Goal:** Test the full yearly page and fix any bugs
1. Run `npm run dev` and navigate to `/yearly`
2. Create a new yearly budget for 2025
3. Add income sources with entries
4. Add categories with monthly amounts
5. Test checkbox (paid) functionality
6. Test copy month modal
7. Test warning colors toggle
8. Test year navigation
9. Fix any bugs or UX issues found
10. **TEST:** Full user flow - create year, add items, check paid

### Phase G: Authentication & Deployment (LATER)
**Goal:** Multi-user support + go live

**Auth Decision: Supabase**
- Free tier: 500MB DB, 50K users (way more than needed for friends/family)
- Includes OAuth (Google, GitHub, etc.)
- Easy Prisma integration

**Migration: SQLite → Supabase Postgres**
- Change ~10 lines in `prisma/schema.prisma` (provider + url)
- Zero changes to API routes, composables, or components
- Prisma handles SQL dialect differences automatically

**Steps:**
1. Create Supabase project (free)
2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run `npx prisma migrate dev`
4. Install `@nuxtjs/supabase`
5. Add OAuth providers in Supabase dashboard
6. Create login/signup pages
7. Add auth middleware
8. Deploy to Cloudflare (need separate planning session)
9. **TEST:** Users can't see each other's data

---

## Composable Structure (Reorganized)

```
composables/
├── shared/
│   ├── useTheme.ts
│   ├── useConfirmDialog.ts
│   └── useUser.ts (future)
├── transaction/              # Transaction Tracker mode
│   ├── useMonths.ts
│   └── useBudget.ts
└── yearly/                   # Yearly Overview mode
    ├── useYearlyBudget.ts
    ├── useYearlyIncome.ts
    ├── useYearlyCategories.ts
    └── useYearlySummary.ts
```

---

## Critical Files Summary

**New Files to Create:**
- `layouts/landing.vue`
- `layouts/yearly.vue`
- `pages/index.vue` (new landing)
- `pages/granular.vue` (moved)
- `pages/yearly.vue`
- `types/yearly.ts`
- `composables/useYearlyBudget.ts`
- `composables/useYearlyIncome.ts`
- `composables/useYearlyCategories.ts`
- `composables/useYearlySummary.ts`
- `components/yearly/*.vue` (9 components)
- `server/api/yearly/**/*.ts` (~15 routes)

**Files to Modify:**
- `prisma/schema.prisma` (add 7 new models)
- `nuxt.config.ts` (if layout config needed)

**Files Unchanged:**
- All existing granular mode components
- All existing composables (useMonths, useBudget, useTheme)
- All existing API routes
- `layouts/default.vue`
