c# Future Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize the budgeting app with updated dependencies, proper state management via Pinia, and improved UI/UX.

**Architecture:** Three-phase approach - (1) dependency updates with careful testing, (2) Pinia migration for state persistence, (3) UI/UX refresh using frontend-design skill.

**Tech Stack:** Nuxt 4, Nuxt UI 4, Prisma 7, Pinia, Tailwind CSS v4

---

## Current State Analysis

### Outdated Dependencies (from `npm outdated`)

| Package | Current | Latest | Breaking Changes |
|---------|---------|--------|------------------|
| nuxt | 3.20.2 | 4.2.2 | MAJOR - New directory structure, codemod available |
| @nuxt/ui | 2.22.3 | 4.3.0 | MAJOR - Color system, component renames, useOverlay |
| @nuxt/devtools | 1.7.0 | 3.1.1 | MAJOR |
| prisma | 6.19.1 | 7.2.0 | MAJOR - New provider, output path required |
| @prisma/client | 6.19.1 | 7.2.0 | MAJOR - Import path changes |
| zod | 3.25.76 | 4.2.1 | MAJOR |
| @types/node | 24.10.4 | 25.0.3 | MAJOR |

### Current State Management
- 11 composables using module-level `ref()` for shared state
- Optimistic updates with manual rollback
- No persistence layer - state lost on refresh

---

## Phase 1: Dependency Audit & Updates

### Task 1.1: Create Git Branch for Updates

**Files:**
- None (git operation)

**Step 1: Create feature branch**
```bash
git checkout -b feature/dependency-updates
```

**Step 2: Verify branch**
```bash
git branch --show-current
# Expected: feature/dependency-updates
```

---

### Task 1.2: Update Safe Dependencies (Minor/Patch)

**Files:**
- Modify: `package.json`

**Step 1: Update non-breaking dependencies**
```bash
npm update
```

**Step 2: Run dev server to verify**
```bash
npm run dev
```
Expected: App starts without errors

**Step 3: Commit safe updates**
```bash
git add package.json package-lock.json
git commit -m "chore: update minor/patch dependencies"
```

---

### Task 1.3: Upgrade Prisma 6 → 7

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `server/utils/prisma.ts`
- Modify: `package.json`

**Step 1: Install Prisma 7**
```bash
npm install @prisma/client@7
npm install -D prisma@7
```

**Step 2: Update schema.prisma generator**
```prisma
generator client {
  provider = "prisma-client"
  output   = "../server/generated/prisma"
  previewFeatures = ["driverAdapters"]
}
```

**Step 3: Update Prisma client import in server/utils/prisma.ts**
```typescript
// Change from:
import { PrismaClient } from '@prisma/client'
// To:
import { PrismaClient } from '../generated/prisma/client'
```

**Step 4: Regenerate Prisma client**
```bash
npx prisma generate
```

**Step 5: Test database connection**
```bash
npm run dev
# Navigate to app and verify data loads
```

**Step 6: Commit Prisma upgrade**
```bash
git add -A
git commit -m "chore: upgrade Prisma to v7"
```

---

### Task 1.4: Upgrade Nuxt 3 → 4

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Potentially multiple files (codemod handles)

**Step 1: Run Nuxt 4 migration codemod**
```bash
npx codemod@latest nuxt/4/migration-recipe
```
This handles:
- Directory structure changes
- Import path updates
- Config migrations

**Step 2: Install Nuxt 4**
```bash
npm install nuxt@4
```

**Step 3: Update @nuxt/devtools**
```bash
npm install -D @nuxt/devtools@3
```

**Step 4: Run typecheck**
```bash
npx nuxi typecheck
```
Expected: No type errors

**Step 5: Test dev server**
```bash
npm run dev
```
Expected: App starts, all features work

**Step 6: Test production build**
```bash
npm run build
```
Expected: Build succeeds

**Step 7: Commit Nuxt upgrade**
```bash
git add -A
git commit -m "chore: upgrade Nuxt to v4"
```

---

### Task 1.5: Upgrade Nuxt UI 2 → 4

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Modify: `app.config.ts`
- Modify: All component files using UButton, UModal, etc.

**Step 1: Run Tailwind CSS upgrade tool**
```bash
npx @tailwindcss/upgrade
```

**Step 2: Install Nuxt UI 4**
```bash
npm install @nuxt/ui@4
```

**Step 3: Update color configuration in app.config.ts**
```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    }
  }
})
```

**Step 4: Update button colors globally**
Search and replace in all .vue files:
- `color="gray"` → `color="neutral" variant="subtle"`
- `color="white"` → `color="neutral" variant="outline"`
- `color="black"` → `color="neutral"`
- `color="red"` → `color="error"`

**Step 5: Update useModal to useOverlay**
Search for `useModal()` and update:
```typescript
// Old:
const modal = useModal()
modal.open(Component)

// New:
const overlay = useOverlay()
const modal = overlay.create(Component)
```

**Step 6: Test all UI components**
```bash
npm run dev
# Manually verify: buttons, modals, forms, tables
```

**Step 7: Commit Nuxt UI upgrade**
```bash
git add -A
git commit -m "chore: upgrade Nuxt UI to v4"
```

---

### Task 1.6: Upgrade Zod 3 → 4 (If Needed)

**Files:**
- Modify: `package.json`
- Potentially modify: `server/api/**/*.ts` (validation schemas)

**Step 1: Check Zod 4 changelog for breaking changes**
Review: https://github.com/colinhacks/zod/releases

**Step 2: Install Zod 4**
```bash
npm install zod@4
```

**Step 3: Run typecheck**
```bash
npx nuxi typecheck
```

**Step 4: Fix any type errors in validation schemas**
(Depends on breaking changes)

**Step 5: Commit Zod upgrade**
```bash
git add -A
git commit -m "chore: upgrade Zod to v4"
```

---

### Task 1.7: Test Full Application & Merge

**Step 1: Run full test suite**
```bash
npm run build
npm run dev
# Test all CRUD operations manually
```

**Step 2: Deploy to preview**
```bash
npm run cf:deploy
```

**Step 3: Merge to master after user verification**
```bash
git checkout master
git merge feature/dependency-updates
git push
```

---

## Phase 2: Pinia State Management

### Task 2.1: Install and Configure Pinia

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Create: `stores/yearly.ts`

**Step 1: Install Pinia**
```bash
npm install pinia @pinia/nuxt
```

**Step 2: Add to nuxt.config.ts**
```typescript
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    // ... other modules
  ]
})
```

**Step 3: Create yearly store skeleton**
```typescript
// stores/yearly.ts
import { defineStore } from 'pinia'

export const useYearlyStore = defineStore('yearly', () => {
  // State
  const currentBudget = ref<YearlyBudgetWithRelations | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions will be migrated from composables

  return {
    currentBudget,
    loading,
    error
  }
})
```

**Step 4: Commit Pinia setup**
```bash
git add -A
git commit -m "feat: add Pinia for state management"
```

---

### Task 2.2: Migrate useYearlyBudget to Pinia

**Files:**
- Modify: `stores/yearly.ts`
- Modify: `composables/useYearlyBudget.ts` (make it use store)
- Modify: Components that use useYearlyBudget

**Step 1: Move state and actions to store**
(Detailed implementation based on current composable)

**Step 2: Update composable to be thin wrapper**
```typescript
// composables/useYearlyBudget.ts
export function useYearlyBudget() {
  const store = useYearlyStore()
  return {
    currentBudget: computed(() => store.currentBudget),
    loading: computed(() => store.loading),
    // ... delegate to store
  }
}
```

**Step 3: Test yearly budget functionality**

**Step 4: Commit migration**
```bash
git add -A
git commit -m "refactor: migrate useYearlyBudget to Pinia store"
```

---

### Task 2.3: Add Persistence Plugin

**Files:**
- Create: `plugins/pinia-persist.ts`
- Modify: `stores/yearly.ts`

**Step 1: Install persistence plugin**
```bash
npm install pinia-plugin-persistedstate
```

**Step 2: Create plugin**
```typescript
// plugins/pinia-persist.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
```

**Step 3: Enable persistence in store**
```typescript
export const useYearlyStore = defineStore('yearly', () => {
  // ... state and actions
}, {
  persist: {
    storage: persistedState.localStorage,
    pick: ['currentBudget'] // Only persist what's needed
  }
})
```

**Step 4: Commit persistence**
```bash
git add -A
git commit -m "feat: add Pinia persistence for offline state"
```

---

### Task 2.4: Migrate Remaining Composables

**Files:**
- Modify: `stores/yearly.ts` or create additional stores
- Modify: All composables to use stores

Composables to migrate:
- [ ] useYearlyIncome
- [ ] useYearlyCategories
- [ ] useYearlySummary
- [ ] useBudget (transaction mode)
- [ ] useMonths (transaction mode)

**Step 1-5: Repeat pattern from Task 2.2 for each composable**

---

## Phase 3: UI/UX Pass

### Task 3.1: Invoke Frontend Design Skill

**REQUIRED:** Use `superpowers:frontend-design` skill for this phase.

This phase should be done after Phase 1 and 2 are complete, as UI changes are easier to implement on the updated stack.

Focus areas:
1. **Dashboard/Overview Page** - Better data visualization
2. **Yearly Grid** - Improved mobile responsiveness
3. **Forms** - Consistent styling, better validation feedback
4. **Dark Mode** - Ensure all components respect theme
5. **Micro-interactions** - Loading states, transitions

---

## Execution Order

1. **Phase 1** (Dependency Audit) - Do first, highest risk
   - Create branch
   - Safe updates
   - Prisma 7 (isolated, testable)
   - Nuxt 4 (has codemod)
   - Nuxt UI 4 (most UI changes)
   - Zod 4 (if needed)
   - Test & merge

2. **Phase 2** (Pinia) - After Phase 1 stable
   - Install & configure
   - Migrate stores incrementally
   - Add persistence

3. **Phase 3** (UI/UX) - After stack is modern
   - Use frontend-design skill
   - Iterate on feedback

---

## Risk Mitigation

- **Git branches** for each major change
- **Deploy to preview** before merging
- **Incremental commits** for easy rollback
- **Manual testing** after each major upgrade
- **Keep current version working** until new is verified

---

## Notes

- wernerbuildsapps uses `pnpm` while budgeting-app uses `npm` - consider standardizing
- wernerbuildsapps has `dotenv-cli` for env handling in deploy script
- v-calendar shows "latest" as 2.4.2 but current is 3.1.2 - this is correct (v3 is Vue 3 version) - we will deprecate vcalendar and use nuxtui datepickers instead as part of this future improvements.
