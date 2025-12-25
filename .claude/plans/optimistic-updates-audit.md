# Optimistic Updates Audit & Fix Plan

## Problem Summary
The yearly mode modals wait for API response before closing, breaking the optimistic update pattern. The user expects forms/modals to close immediately while API calls happen in background.

## Audit Results

### Transaction Mode (FIXED)
| File | Handler | Status |
|------|---------|--------|
| `components/FixedPaymentsList.vue` | handleAdd, handleUpdate | Fixed |
| `components/TransactionList.vue` | handleAdd, handleUpdate | Fixed |
| `components/BudgetCategoryCard.vue` | handleUpdateCategory | Fixed |
| `pages/transaction/[year]/[month].vue` | handleAddCategory | Fixed |

### Yearly Mode - NEEDS FIX

#### Category A: Modal Handlers (HIGH PRIORITY)

**File: `pages/yearly/[year].vue`**

| Handler | Line | Issue |
|---------|------|-------|
| `handleAddCategory` | 98-107 | `await createCategory(...)` before `showAddCategoryModal = false` |
| `handleAddSubcategory` | 115-132 | `await createCategory(...)` before `showAddSubcategoryModal = false` |
| `handleAddIncomeSource` | 167-175 | `await createIncomeSource(...)` before `showAddIncomeSourceModal = false` |

#### Category B: Loop Handlers (MEDIUM - Works but Sequential)

**File: `components/yearly/IncomeSection.vue`**

| Handler | Line | Issue |
|---------|------|-------|
| `handleAddDeduction` | 48-60 | Loops 12 times with sequential `await createDeduction()` |
| `handleRenameDeduction` | 91-103 | Loops 12 times with sequential `await updateDeduction()` |

Note: These work because composables are optimistic, but each iteration waits for previous API call.

#### Already Working (Composables are Optimistic)
- `handleUpdateEntry` - Direct composable call
- `handleRenameSource` - Direct composable call
- `handleDeleteSource` - Dialog + composable
- `handleDeleteDeduction` - Dialog + loop (composable handles optimistic)
- Inline edits in IncomeSourceRow.vue and CategoryRow.vue (emit to parent)

---

## Fix Plan

### Step 1: Fix Modal Handlers in `pages/yearly/[year].vue`

**Fix `handleAddCategory` (line 98-107):**
```typescript
async function handleAddCategory() {
  if (!newCategoryName.value.trim() || !addCategoryForSectionId.value) return
  // Capture values before clearing
  const data = {
    sectionId: addCategoryForSectionId.value,
    name: newCategoryName.value.trim(),
  }
  // Close modal immediately (optimistic)
  showAddCategoryModal.value = false
  newCategoryName.value = ''
  addCategoryForSectionId.value = null
  // API call in background
  try {
    await createCategory(data)
  } catch (error) {
    console.error('Failed to add category:', error)
  }
}
```

**Fix `handleAddSubcategory` (line 115-132):**
```typescript
async function handleAddSubcategory() {
  if (!newSubcategoryName.value.trim() || !addSubcategoryParentId.value) return
  // Find parent and capture data
  let sectionId: number | null = null
  const parentId = addSubcategoryParentId.value
  const name = newSubcategoryName.value.trim()
  for (const section of sections.value) {
    if (section.categories.find(c => c.id === parentId)) {
      sectionId = section.id
      break
    }
  }
  if (!sectionId) return
  // Close modal immediately (optimistic)
  showAddSubcategoryModal.value = false
  newSubcategoryName.value = ''
  addSubcategoryParentId.value = null
  // API call in background
  try {
    await createCategory({ sectionId, name, parentId })
  } catch (error) {
    console.error('Failed to add subcategory:', error)
  }
}
```

**Fix `handleAddIncomeSource` (line 167-175):**
```typescript
async function handleAddIncomeSource() {
  if (!newIncomeSourceName.value.trim() || !currentBudget.value) return
  // Capture values before clearing
  const data = {
    yearlyBudgetId: currentBudget.value.id,
    name: newIncomeSourceName.value.trim(),
  }
  // Close modal immediately (optimistic)
  showAddIncomeSourceModal.value = false
  newIncomeSourceName.value = ''
  // API call in background
  try {
    await createIncomeSource(data)
  } catch (error) {
    console.error('Failed to add income source:', error)
  }
}
```

### Step 2: Optimize Loop Handlers in `components/yearly/IncomeSection.vue`

**Optimize `handleAddDeduction` (line 48-60):**
Instead of sequential awaits, collect all promises and run in parallel:
```typescript
async function handleAddDeduction(sourceId: number, deductionName: string) {
  const promises = []
  for (let month = 1; month <= 12; month++) {
    const entry = getIncomeEntry(sourceId, month)
    if (entry) {
      promises.push(createDeduction({
        incomeEntryId: entry.id,
        name: deductionName,
        amount: 0,
      }))
    }
  }
  // All optimistic updates applied immediately, APIs run in parallel
  await Promise.all(promises)
}
```

**Optimize `handleRenameDeduction` (line 91-103):**
```typescript
async function handleRenameDeduction(oldName: string, newName: string, sourceId: number) {
  const source = incomeSources.value.find(s => s.id === sourceId)
  if (!source) return
  const promises = []
  for (const entry of source.entries) {
    const deduction = entry.deductions.find(d => d.name === oldName)
    if (deduction) {
      promises.push(updateDeduction(deduction.id, { name: newName }))
    }
  }
  await Promise.all(promises)
}
```

### Step 3: Add Sync Indicators for Yearly Mode (Optional Enhancement)

Add `isTempId` check to yearly components for visual feedback:
- `components/yearly/IncomeSourceRow.vue` - Show pulse on source row
- `components/yearly/CategoryRow.vue` - Show pulse on category row

---

## Files to Modify

1. `pages/yearly/[year].vue` - Fix 3 modal handlers
2. `components/yearly/IncomeSection.vue` - Optimize 2 loop handlers

---

## Verification Checklist

After implementation, test these flows:
- [ ] Add category modal closes instantly, category appears with pulse
- [ ] Add subcategory modal closes instantly
- [ ] Add income source modal closes instantly, source appears with pulse
- [ ] Add deduction appears for all 12 months instantly
- [ ] Rename deduction updates all 12 months instantly
- [ ] Error shows toast notification
- [ ] Failed operations roll back state
