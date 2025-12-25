# Optimistic Updates Implementation Plan

## Problem
Supabase API latency causes 2-3 second delays on every CRUD operation because:
1. Every operation waits for API response
2. Then calls `refreshCurrentMonth()` (full fetch)
3. Then calls `refreshSummary()` (another fetch)

## Solution
Update UI instantly, sync with API in background, rollback on error.

---

## Key Design Decisions

| Decision | Approach |
|----------|----------|
| **Temp IDs** | Negative numbers (`-1`, `-2`, ...) - easy to identify, no collision |
| **Readonly arrays** | Create new array references with spread operators |
| **Error handling** | Store previous state snapshot, rollback + toast notification |
| **Summary** | Recalculate locally instead of fetching |
| **Sync indicator** | `animate-pulse` on items with temp ID |

---

## Files to Create/Modify

### 1. NEW: `composables/useOptimisticUpdates.ts`
- `generateTempId()` - returns negative counter
- `pendingOperations` - Map tracking in-flight operations
- `isSyncing(entity, id)` - check if item is syncing
- `showErrorToast()` - Nuxt UI toast wrapper

### 2. MODIFY: `composables/useBudget.ts`
Refactor all 9 CRUD functions to:
```
1. Generate temp ID (creates) / store previous state
2. Update local state immediately
3. Recalculate summary locally
4. Fire API call (no await blocking UI)
5. On success: replace temp ID with real ID
6. On error: rollback state + show toast
```

Functions to update:
- `createTransaction`, `updateTransaction`, `deleteTransaction`
- `createCategory`, `updateCategory`, `deleteCategory`
- `createFixedPayment`, `updateFixedPayment`, `deleteFixedPayment`

### 3. MODIFY: `composables/useMonths.ts`
- Export writable `currentMonth` reference for optimistic mutations
- Keep readonly export for components

### 4. MODIFY: `app.vue`
- Add `<UNotifications />` for toast display

### 5. MODIFY: Component UI indicators
- `TransactionList.vue` - add pulse animation for temp IDs
- `FixedPaymentsList.vue` - same pattern
- `BudgetCategoryCard.vue` - same pattern

### 6. MODIFY: `types/budget.ts`
- Add `PendingOperation` interface

---

## Implementation Order

1. **Infrastructure** (~30 min)
   - Create `useOptimisticUpdates.ts`
   - Add `<UNotifications />` to app.vue
   - Add types

2. **Transactions** (~1 hour)
   - Implement optimistic create/update/delete
   - Add `recalculateSummary()` helper
   - Test with TransactionList

3. **Fixed Payments** (~30 min)
   - Apply same pattern

4. **Categories** (~30 min)
   - Apply same pattern

5. **UI Polish** (~30 min)
   - Add sync indicators to all components
   - Test error scenarios

---

## Local Summary Calculation

```typescript
const recalculateSummary = (): MonthSummary | null => {
  if (!currentMonth.value) return null
  const month = currentMonth.value

  const totalFixedPayments = month.fixedPayments.reduce((sum, fp) => sum + fp.amount, 0)
  const totalBudgeted = month.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0)
  const totalSpent = month.categories.reduce((sum, cat) =>
    sum + cat.transactions.reduce((s, t) => s + t.amount, 0), 0)

  return {
    monthId: month.id,
    monthName: month.name,
    income: month.income,
    totalFixedPayments,
    availableAfterFixed: month.income - totalFixedPayments,
    totalBudgeted,
    availableAfterBudgets: month.income - totalFixedPayments - totalBudgeted,
    totalSpent,
    totalRemaining: month.income - totalFixedPayments - totalSpent,
    categories: month.categories.map(cat => {
      const spent = cat.transactions.reduce((sum, t) => sum + t.amount, 0)
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        allocated: cat.allocatedAmount,
        spent,
        remaining: Math.max(0, cat.allocatedAmount - spent)
      }
    })
  }
}
```

---

## Optimistic Pattern (Transaction Example)

```typescript
const createTransaction = async (data: CreateTransactionDTO) => {
  // 1. Snapshot for rollback
  const previousMonth = JSON.parse(JSON.stringify(currentMonth.value))

  // 2. Create optimistic entry with temp ID
  const tempId = generateTempId()
  const optimisticEntry = { id: tempId, ...data, createdAt: now, updatedAt: now }

  // 3. Update state immediately (user sees instant UI update)
  currentMonth.value = {
    ...currentMonth.value,
    categories: currentMonth.value.categories.map(cat =>
      cat.id === data.categoryId
        ? { ...cat, transactions: [...cat.transactions, optimisticEntry] }
        : cat
    )
  }
  summary.value = recalculateSummary()

  // 4. API call in background
  try {
    const real = await $fetch('/api/transactions', { method: 'POST', body: data })
    // Replace temp ID with real ID
    replaceTransaction(tempId, real)
  } catch (error) {
    // Rollback
    currentMonth.value = previousMonth
    summary.value = recalculateSummary()
    showErrorToast('Failed to save transaction')
  }
}
```

---

## Edge Cases Handled

- **Temp ID identification**: `id < 0` means pending
- **Error rollback**: Full state snapshot restored
- **Summary consistency**: Always recalculated after state change
- **Visual feedback**: Pulse animation on syncing items

---

## Estimated Time: ~3 hours total
