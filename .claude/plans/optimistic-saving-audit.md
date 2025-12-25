# Complete Optimistic Saving Audit & Fix Plan

## Goal
A performant app that saves silently in the background with proper error handling and no double-submission bugs.

---

## Audit Summary

### Critical Bugs Found

| Priority | File | Issue | Impact |
|----------|------|-------|--------|
| CRITICAL | `components/TransactionList.vue` | `isAdding`/`isUpdating` never set to true | Double submission possible |
| CRITICAL | `components/FixedPaymentsList.vue` | No loading state at all | Double submission possible |
| HIGH | `composables/useYearlyBudget.ts` | Not optimistic (waits for server) | Blocking UI |
| HIGH | `composables/useMonths.ts` | Not optimistic (waits for server) | Blocking UI |
| MEDIUM | `composables/useOptimisticUpdates.ts` | Missing entity types | Incomplete tracking |
| LOW | All composables | No success toast feedback | UX polish |

---

## Detailed Findings

### 1. TransactionList.vue - CRITICAL BUG

**Location:** `components/TransactionList.vue` lines 228-244, 272-288

**Problem:** Guards exist but flags never set:
```typescript
// Lines 200-201: Refs defined
const isAdding = ref(false)
const isUpdating = ref(false)

// Line 229: Guard exists
if (isAdding.value) return  // <- Never triggers because...

// isAdding.value = true is NEVER called!
```

**Impact:** User can click submit multiple times before API responds, creating duplicate entries.

**Fix:**
```typescript
const handleAdd = async () => {
  if (isAdding.value) return
  isAdding.value = true  // ADD THIS
  const data = { ... }
  cancelAdd()
  try {
    await createTransaction(data)
  } catch (error) {
    console.error('Failed to add transaction:', error)
  } finally {
    isAdding.value = false  // ADD THIS
  }
}
```

---

### 2. FixedPaymentsList.vue - CRITICAL BUG

**Location:** `components/FixedPaymentsList.vue` lines 186-200, 220-233

**Problem:** No loading state refs or guards defined at all:
- No `isAdding` ref
- No `isUpdating` ref
- No `:disabled` bindings on buttons
- No guards in handlers

**Impact:** User can create duplicate fixed payments on slow networks.

**Fix:** Add loading state pattern matching TransactionList.vue:
```typescript
const isAdding = ref(false)
const isUpdating = ref(false)

const handleAdd = async () => {
  if (isAdding.value) return
  isAdding.value = true
  const data = { ... }
  cancelAdd()
  try {
    await createFixedPayment(data)
  } catch (error) {
    console.error('Failed to add fixed payment:', error)
  } finally {
    isAdding.value = false
  }
}
```

Also add `:disabled="isAdding"` to form inputs and buttons.

---

### 3. useYearlyBudget.ts - HIGH PRIORITY

**Location:** `composables/useYearlyBudget.ts` lines 90-157

**Problem:** All CRUD operations set `loading.value = true` and wait for server response before updating UI.

**Impact:** Creating/updating/deleting yearly budgets feels slow.

**Current (blocking):**
```typescript
async function createBudget(dto) {
  loading.value = true  // Shows spinner
  const data = await $fetch(...)  // WAITS
  budgets.value.push(data)  // Then updates
  loading.value = false
}
```

**Fix (optimistic):**
```typescript
async function createBudget(dto) {
  const previousState = JSON.parse(JSON.stringify(budgets.value))
  const tempId = generateTempId()
  const optimisticBudget = { ...dto, id: tempId }

  // Update UI immediately
  budgets.value.push(optimisticBudget)
  currentBudget.value = optimisticBudget

  try {
    const data = await $fetch(...)
    // Replace temp with real
    const index = budgets.value.findIndex(b => b.id === tempId)
    if (index !== -1) budgets.value[index] = data
    currentBudget.value = data
    return data
  } catch (error) {
    // Rollback
    budgets.value = previousState
    showErrorToast(error.message)
    throw error
  }
}
```

---

### 4. useMonths.ts - HIGH PRIORITY

**Location:** `composables/useMonths.ts` lines 104-180

**Problem:** All CRUD operations wait for server before updating UI. No temp IDs, no rollback.

**Impact:** Creating/updating/deleting months feels slow.

**Fix:** Same optimistic pattern as useBudget.ts:
- Clone state before mutation
- Generate temp ID
- Update UI immediately
- Replace with real ID on success
- Rollback on error

---

### 5. useOptimisticUpdates.ts - MEDIUM

**Location:** `composables/useOptimisticUpdates.ts` line 6

**Current:**
```typescript
entity: 'transaction' | 'category' | 'fixedPayment'
```

**Missing entities:**
- `'incomeSource'`
- `'incomeEntry'`
- `'deduction'`
- `'section'`
- `'yearlyBudget'`
- `'month'`

**Fix:** Extend the type:
```typescript
entity: 'transaction' | 'category' | 'fixedPayment' |
        'incomeSource' | 'incomeEntry' | 'deduction' |
        'section' | 'yearlyBudget' | 'month'
```

---

### 6. Yearly Mode Modals (from previous plan)

**Still needs to be fixed per polymorphic-prancing-minsky.md:**
- `pages/yearly/[year].vue` - handleAddCategory, handleAddSubcategory, handleAddIncomeSource
- `components/yearly/IncomeSection.vue` - handleAddDeduction, handleRenameDeduction

---

## Implementation Order

### Phase 1: Fix Critical Double-Submission Bugs
1. **TransactionList.vue** - Add `isAdding.value = true/false` wrapper
2. **FixedPaymentsList.vue** - Add loading refs, guards, and disabled bindings

### Phase 2: Fix Yearly Mode Modals
3. **pages/yearly/[year].vue** - Close modals before await (per previous plan)
4. **IncomeSection.vue** - Parallelize loop handlers with Promise.all

### Phase 3: Make Non-Optimistic Composables Optimistic
5. **useOptimisticUpdates.ts** - Extend entity types
6. **useMonths.ts** - Convert to optimistic pattern
7. **useYearlyBudget.ts** - Convert to optimistic pattern

### Phase 4: Fix Currency Double-Conversion Bug (CRITICAL)
8. **useYearlyCategories.ts** - Remove `randsToCents()` from optimistic update (component already converts)
9. **useYearlyIncome.ts** - Remove `randsToCents()` from optimistic updates (component already converts)

### Phase 5: Polish (Optional)
10. Add global syncing indicator
11. Add subtle success feedback

---

## Currency Double-Conversion Bug Details

### Root Cause

**YEARLY mode has inconsistent conversion patterns:**

| Location | What it does | Problem |
|----------|--------------|---------|
| `CategoryRow.vue:86` | Converts RANDS→CENTS before emit | Correct for API |
| `IncomeSourceRow.vue:92,107` | Converts RANDS→CENTS before emit | Correct for API |
| `useYearlyCategories.ts:226` | ALSO converts RANDS→CENTS | **DOUBLE CONVERSION!** |
| `useYearlyIncome.ts:150,193,243` | ALSO converts RANDS→CENTS | **DOUBLE CONVERSION!** |

**Result:** User enters R500 → Component converts to 50000 cents → Composable converts again to 5000000 → Display shows R50,000 instead of R500!

**TRANSACTIONAL mode is FINE:**
- `TransactionList.vue` and `FixedPaymentsList.vue` pass RANDS directly
- `useBudget.ts` correctly converts once in optimistic update

### Fix (Minimal - Keep Cents in State)

Remove `randsToCents()` from YEARLY composable optimistic updates since components already convert:

**useYearlyCategories.ts line 224-227:**
```typescript
// BEFORE (double converts):
const optimisticDto = dto.amount !== undefined
  ? { ...dto, amount: randsToCents(dto.amount) }
  : dto

// AFTER (correct):
const optimisticDto = dto
```

**useYearlyIncome.ts line 148-151:**
```typescript
// BEFORE:
const optimisticDto = dto.grossAmount !== undefined
  ? { ...dto, grossAmount: randsToCents(dto.grossAmount) }
  : dto

// AFTER:
const optimisticDto = dto
```

**useYearlyIncome.ts line 193:**
```typescript
// BEFORE:
const amountInCents = randsToCents(dto.amount)

// AFTER:
const amountInCents = dto.amount
```

**useYearlyIncome.ts line 241-244:**
```typescript
// BEFORE:
const optimisticDto = dto.amount !== undefined
  ? { ...dto, amount: randsToCents(dto.amount) }
  : dto

// AFTER:
const optimisticDto = dto
```

### Future TODO (User Requested)

> "Frontend doesn't care about cents. Only cares about rands. Bad separation of concerns."

Refactor later to:
- Frontend stores RANDS everywhere (display units)
- Only convert to CENTS at API boundary (in $fetch calls)
- Only convert from CENTS when hydrating from API

---

## Files to Modify

| File | Changes | Status |
|------|---------|--------|
| `components/TransactionList.vue` | Add loading state wrappers | ✅ DONE |
| `components/FixedPaymentsList.vue` | Add loading refs, guards, disabled bindings | ✅ DONE |
| `pages/yearly/[year].vue` | Close modals before await | ✅ DONE |
| `components/yearly/IncomeSection.vue` | Parallelize loop handlers | ✅ DONE |
| `composables/useOptimisticUpdates.ts` | Extend entity types | ✅ DONE |
| `composables/useMonths.ts` | Convert to optimistic pattern | ✅ DONE |
| `composables/useYearlyBudget.ts` | Convert to optimistic pattern | ✅ DONE |
| `composables/useYearlyCategories.ts` | Remove double `randsToCents()` at line 226 | ⏳ TODO |
| `composables/useYearlyIncome.ts` | Remove double `randsToCents()` at lines 150, 193, 243 | ⏳ TODO |

---

## Verification Checklist

After implementation:
- [x] TransactionList: Cannot submit twice rapidly
- [x] FixedPaymentsList: Cannot submit twice rapidly
- [x] Yearly modals close instantly
- [x] Deduction add/rename happens for all 12 months instantly
- [x] Month creation feels instant
- [x] Yearly budget creation feels instant
- [x] Errors show toast and rollback state
- [ ] **Yearly category amounts display correctly during optimistic save**
- [ ] **Yearly income/deduction amounts display correctly during optimistic save**
- [ ] No console errors during normal operation
