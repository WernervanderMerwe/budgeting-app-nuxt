# Bug Fixes - Yearly View Optimistic Updates & Race Conditions

## Root Cause Analysis

**Common Denominator:** The `refreshBudgetSilently()` pattern is overused. Most update functions:
1. Apply optimistic update to local state
2. Send API request (PATCH/POST)
3. Call `refreshBudgetSilently()` which fetches entire budget from `/api/yearly/[id]`

**The Problem:** The full refresh can return before the PATCH/POST is committed to DB, overwriting optimistic state with stale data. This causes the "flicker back" behavior.

**The Solution:** Follow the pattern already used in `createCategory()`:
- Trust the API response data
- Update local state directly with API response
- NO full refresh needed

---

## Bugs to Fix

| Bug | Function | Current Behavior | Fix |
|-----|----------|------------------|-----|
| Amount flicker | `updateCategoryEntry()` | Calls `refreshBudgetSilently()` | Remove refresh, trust optimistic update |
| Checkbox persistence | `updateCategoryEntry()` | Same as above | Same fix |
| Rapid checkbox race | `updateCategoryEntry()` | Multiple refreshes race | Remove refresh |
| Name edit flicker | `updateCategory()` | Calls `refreshBudgetSilently()` | Remove refresh, trust API response |
| Name edit flicker | `updateSection()` | Calls `refreshBudgetSilently()` | Remove refresh, trust API response |
| Copy month no update | `copyFromMonth()` | Uses `fetchBudgetById(id, false)` | API timing - may need investigation |
| Temp ID not replaced | `createCategory()` | Already fixed in staged changes | Just commit |

---

## Implementation Plan

### File: `composables/useYearlyCategories.ts`

#### 1. `updateSection()` (lines 27-59)
```typescript
// REMOVE: await refreshBudgetSilently()
// Optimistic update is already applied, API returns updated section
// No action needed after API success
```

#### 2. `updateCategory()` (lines 163-207)
```typescript
// REMOVE: await refreshBudgetSilently()
// Optimistic update is already applied, API returns updated category
// No action needed after API success
```

#### 3. `updateCategoryEntry()` (lines 247-300)
```typescript
// REMOVE: await refreshBudgetSilently() (when skipRefresh=false)
// Optimistic update is already applied, API returns updated entry
// No action needed after API success
```

#### 4. `checkAllChildrenForCategory()` (lines 309-328)
```typescript
// REMOVE: await refreshBudgetSilently() at end
// Each updateCategoryEntry already applies optimistic update
// No final refresh needed
```

#### 5. `checkAllCategoriesForSection()` (lines 332-360)
```typescript
// REMOVE: await refreshBudgetSilently() at end
// Each updateCategoryEntry already applies optimistic update
// No final refresh needed
```

#### 6. `copyFromMonth()` (lines 364-378)
```typescript
// KEEP: fetchBudgetById() but ensure it's after POST completes
// This operation changes many entries, full refresh is appropriate
// May need to add explicit await or error handling
```

### File: `composables/useYearlyIncome.ts`

Apply same pattern to:
- `createIncomeSource()` - Remove refresh, replace temp ID directly (like createCategory)
- `updateIncomeSource()` - Remove refresh
- `updateIncomeEntry()` - Remove refresh
- `createDeduction()` - Remove refresh, replace temp ID directly
- `updateDeduction()` - Remove refresh

---

## Files to Modify

1. `composables/useYearlyCategories.ts` - Remove 5 `refreshBudgetSilently()` calls
2. `composables/useYearlyIncome.ts` - Remove 5 `refreshBudgetSilently()` calls
3. Commit staged changes (createCategory temp ID fix already done)

---

## Testing Checklist

After implementation, verify:
- [ ] Edit category amount → persists immediately, no flicker
- [ ] Toggle checkbox → persists immediately, no flicker
- [ ] Toggle multiple checkboxes rapidly → all persist correctly
- [ ] Check all children → all persist correctly
- [ ] Check all in section → all persist correctly
- [ ] Edit category name → persists immediately
- [ ] Edit section name → persists immediately
- [ ] Create subcategory → no temp ID shown
- [ ] Copy month → UI updates with new values
- [ ] Income source/entry/deduction edits → persist correctly

---

## Notes

- `deleteCategory()` and `deleteDeduction()` already use correct pattern (optimistic delete, no refresh)
- `createCategory()` already has correct pattern (replace temp ID, no refresh) - use as reference
- The `skipRefresh` parameter in `updateCategoryEntry()` can be removed entirely since we're removing all refreshes
