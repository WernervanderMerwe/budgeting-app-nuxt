# Nuxt Budgeting App - UX Regression Fixes Implementation Plan

## Executive Summary

This plan addresses critical UX regressions discovered when comparing the Nuxt rebuild against the original Angular app. Through comprehensive analysis using Playwright testing and codebase exploration, we identified 26 distinct UI/UX issues ranging from critical functional gaps to polish improvements.

**Scope:** Implement all 3 phases (Critical Fixes, Layout Polish, Nice-to-Haves)
**Estimated Time:** 5.5-7.5 hours total
**Database Changes:** None required (schema already supports all features)

---

## Phase 1: Critical UX Fixes (3-4 hours)

### 1.1 Add Transaction Date Picker with Validation

**Problem:** Transactions auto-timestamp with `getCurrentTimestamp()` - users cannot control when transactions occurred (major regression from Angular which had full date picker with min/max validation).

**Impact:** Users cannot backdate transactions, no chronological accuracy for historical data.

**Files to Modify:**
- `components/TransactionList.vue` (primary changes)
- `components/BudgetCategoryCard.vue` (pass month context)
- `pages/index.vue` (pass month year/month props)

**Implementation Steps:**

1. **Update TransactionList Props** (line 148):
   ```typescript
   interface Props {
     categoryId: number
     transactions: readonly Transaction[]
     monthYear: number   // NEW
     monthMonth: number  // NEW (1-12)
   }
   ```

2. **Add dayjs import and date boundary computed properties** (after line 178):
   ```typescript
   import dayjs from 'dayjs'

   const monthStartDate = computed(() => {
     return dayjs().year(props.monthYear).month(props.monthMonth - 1)
       .startOf('month').format('YYYY-MM-DD')
   })

   const monthEndDate = computed(() => {
     return dayjs().year(props.monthYear).month(props.monthMonth - 1)
       .endOf('month').format('YYYY-MM-DD')
   })
   ```

3. **Update newTransaction ref** (replace lines 159-162):
   ```typescript
   const newTransaction = ref({
     description: '',
     amount: 0,
     date: formatDate(getCurrentTimestamp(), 'iso'),
   })
   ```

4. **Add date input to add form** (insert after line 33):
   ```vue
   <div class="w-full mt-2">
     <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
       Date
     </label>
     <input
       v-model="newTransaction.date"
       type="date"
       :min="monthStartDate"
       :max="monthEndDate"
       class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
       required
     />
   </div>
   ```

5. **Update handleAdd** (replace lines 180-192):
   ```typescript
   const handleAdd = async () => {
     try {
       const dateTimestamp = parseDate(newTransaction.value.date) || getCurrentTimestamp()
       await createTransaction({
         categoryId: props.categoryId,
         description: newTransaction.value.description,
         amount: newTransaction.value.amount,
         transactionDate: dateTimestamp,
       })
       cancelAdd()
     } catch (error) {
       console.error('Failed to add transaction:', error)
     }
   }
   ```

6. **Update cancelAdd** (replace lines 194-197):
   ```typescript
   const cancelAdd = () => {
     showAddForm.value = false
     newTransaction.value = {
       description: '',
       amount: 0,
       date: formatDate(getCurrentTimestamp(), 'iso')
     }
   }
   ```

7. **Update editedTransaction ref** (replace lines 164-167):
   ```typescript
   const editedTransaction = ref({
     description: '',
     amount: 0,
     date: '',
   })
   ```

8. **Update startEditing** (replace lines 199-205):
   ```typescript
   const startEditing = (transaction: Transaction) => {
     editingId.value = transaction.id
     editedTransaction.value = {
       description: transaction.description || '',
       amount: centsToRands(transaction.amount),
       date: transaction.transactionDate
         ? formatDate(transaction.transactionDate, 'iso')
         : formatDate(getCurrentTimestamp(), 'iso'),
     }
   }
   ```

9. **Add date input to edit form** (insert after line 115):
   ```vue
   <input
     v-model="editedTransaction.date"
     type="date"
     :min="monthStartDate"
     :max="monthEndDate"
     class="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
   />
   ```

10. **Update handleUpdate** (replace lines 212-222):
    ```typescript
    const handleUpdate = async (id: number) => {
      try {
        const dateTimestamp = parseDate(editedTransaction.value.date) || getCurrentTimestamp()
        await updateTransaction(id, {
          description: editedTransaction.value.description,
          amount: editedTransaction.value.amount,
          transactionDate: dateTimestamp,
        })
        cancelEditing()
      } catch (error) {
        console.error('Failed to update transaction:', error)
      }
    }
    ```

11. **Update BudgetCategoryCard Props** (around line 137):
    ```typescript
    interface Props {
      category: BudgetCategoryWithTransactions
      monthYear: number   // NEW
      monthMonth: number  // NEW
    }
    ```

12. **Update BudgetCategoryCard TransactionList usage** (replace lines 124-127):
    ```vue
    <TransactionList
      :category-id="category.id"
      :transactions="category.transactions"
      :month-year="monthYear"
      :month-month="monthMonth"
    />
    ```

13. **Update pages/index.vue** (replace lines 110-114):
    ```vue
    <BudgetCategoryCard
      v-for="category in currentMonth.categories"
      :key="category.id"
      :category="category"
      :month-year="currentMonth.year"
      :month-month="currentMonth.month"
    />
    ```

**Testing:**
- Open a month, add transaction with custom date
- Verify date picker shows and is constrained to month boundaries
- Edit transaction, change date
- Verify dates persist correctly after save

---

### 1.2 Remove Redundant Month Name Field (Auto-generate)

**Problem:** Users must manually type "January 2025" when Year + Month dropdowns already provide this data. This creates potential for inconsistency and is illogical UX.

**Impact:** Duplicate data entry, potential naming inconsistencies.

**File to Modify:** `components/MonthSidebar.vue`

**Implementation Steps:**

1. **Add import** (update line 185):
   ```typescript
   import { getCurrentYear, getCurrentMonth, getMonthName } from '~/utils/date'
   ```

2. **Update newMonth ref** (replace lines 202-207):
   ```typescript
   const newMonth = ref({
     year: getCurrentYear(),
     month: getCurrentMonth(),
     income: 0,
   })
   ```

3. **Add computed property** (after newMonth ref):
   ```typescript
   const generatedMonthName = computed(() => {
     return `${getMonthName(newMonth.value.month)} ${newMonth.value.year}`
   })
   ```

4. **Delete Month Name input field** (delete lines 71-83 entirely)

5. **Add preview display** (insert after line 123, after Month select):
   ```vue
   <!-- Auto-generated name preview -->
   <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
     <p class="text-sm text-blue-700 dark:text-blue-300">
       <span class="font-medium">Creating:</span> {{ generatedMonthName }}
     </p>
   </div>
   ```

6. **Update handleCreateMonth** (update lines 212-217):
   ```typescript
   const created = await createMonth({
     name: generatedMonthName.value,
     year: newMonth.value.year,
     month: newMonth.value.month,
     income: newMonth.value.income,
     copyFromMonthId: copyFromPrevious.value ? selectedMonthId.value : undefined,
   })
   ```

7. **Update reset logic** (update lines 223-228):
   ```typescript
   newMonth.value = {
     year: getCurrentYear(),
     month: getCurrentMonth(),
     income: 0,
   }
   ```

**Testing:**
- Open create month modal
- Verify no manual name input exists
- Change year/month, verify preview updates
- Create month, verify correct auto-generated name in sidebar

---

### 1.3 Implement Soft Sequential Month Enforcement

**Problem:** Angular disabled non-sequential month options to ensure logical progression. Nuxt allows any month/year combination which can create confusing data.

**Approach:** Soft enforcement with warning and override checkbox (per user preference).

**File to Modify:** `components/MonthSidebar.vue`

**Implementation Steps:**

1. **Add computed properties** (after generatedMonthName):
   ```typescript
   const latestMonth = computed(() => {
     if (!hasMonths.value) return null
     return sortedMonths.value[0] // First is latest (desc sort)
   })

   const nextValidMonth = computed(() => {
     if (!latestMonth.value) {
       return { year: getCurrentYear(), month: getCurrentMonth() }
     }

     let nextMonth = latestMonth.value.month + 1
     let nextYear = latestMonth.value.year

     if (nextMonth > 12) {
       nextMonth = 1
       nextYear += 1
     }

     return { year: nextYear, month: nextMonth }
   })

   const isValidMonthSelection = computed(() => {
     if (!hasMonths.value) return true

     return (
       newMonth.value.year === nextValidMonth.value.year &&
       newMonth.value.month === nextValidMonth.value.month
     )
   })
   ```

2. **Add override ref** (after line 200):
   ```typescript
   const overrideSequential = ref(false)
   ```

3. **Add watch to auto-set on modal open** (after refs):
   ```typescript
   watch(showCreateModal, (isOpen) => {
     if (isOpen && hasMonths.value) {
       // Auto-set to next sequential month
       newMonth.value.year = nextValidMonth.value.year
       newMonth.value.month = nextValidMonth.value.month
     }
     if (!isOpen) {
       overrideSequential.value = false
     }
   })
   ```

4. **Add validation warning UI** (insert after preview div):
   ```vue
   <!-- Sequential validation warning -->
   <div
     v-if="hasMonths && !isValidMonthSelection && !overrideSequential"
     class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700"
   >
     <p class="text-sm text-amber-700 dark:text-amber-300">
       <span class="font-medium">Recommendation:</span> For sequential budgeting,
       the next month should be {{ getMonthName(nextValidMonth.month) }} {{ nextValidMonth.year }}
     </p>
   </div>

   <!-- Override checkbox -->
   <div v-if="hasMonths && !isValidMonthSelection" class="flex items-start space-x-2">
     <input
       id="overrideSequential"
       v-model="overrideSequential"
       type="checkbox"
       class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
     />
     <label for="overrideSequential" class="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
       I understand, let me create a non-sequential month
     </label>
   </div>
   ```

5. **Disable submit when invalid** (update submit button around line 169):
   ```vue
   <button
     type="submit"
     :disabled="isCreating || (hasMonths && !isValidMonthSelection && !overrideSequential)"
     class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
   >
     {{ isCreating ? 'Creating...' : 'Create Month' }}
   </button>
   ```

**Testing:**
- Create first month (any selection allowed)
- Create second month (should auto-select next sequential)
- Manually change to non-sequential month, verify warning appears
- Check override checkbox, verify submit enabled

---

### 1.4 Pre-fill Income from Current Month

**Problem:** Income defaults to 0, forcing users to re-enter every month. Angular pre-filled from current month.

**File to Modify:** `components/MonthSidebar.vue`

**Implementation Steps:**

1. **Add centsToRands import** (update imports):
   ```typescript
   import { centsToRands } from '~/utils/currency'
   ```

2. **Get currentMonth from useMonths** (update destructuring around line 187):
   ```typescript
   const {
     sortedMonths,
     selectedMonthId,
     currentMonth,      // ADD THIS
     isLoadingMonths,
     monthsError,
     hasMonths,
     fetchMonths,
     selectMonth,
     createMonth,
   } = useMonths()
   ```

3. **Add computed property** (after refs):
   ```typescript
   const previousMonthIncome = computed(() => {
     if (!currentMonth.value) return 0
     return centsToRands(currentMonth.value.income)
   })
   ```

4. **Update watch for showCreateModal** (combine with sequential logic):
   ```typescript
   watch(showCreateModal, (isOpen) => {
     if (isOpen) {
       // Pre-fill income from current month
       newMonth.value.income = previousMonthIncome.value

       // Pre-check copy checkbox
       copyFromPrevious.value = !!selectedMonthId.value

       if (hasMonths.value) {
         // Auto-set to next sequential month
         newMonth.value.year = nextValidMonth.value.year
         newMonth.value.month = nextValidMonth.value.month
       }
     }
     if (!isOpen) {
       overrideSequential.value = false
       copyFromPrevious.value = false
     }
   })
   ```

5. **Add helper text** (insert after income input around line 139):
   ```vue
   <p v-if="previousMonthIncome > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
     Pre-filled from current month (R {{ previousMonthIncome.toFixed(2) }})
   </p>
   ```

**Testing:**
- Select a month with income
- Open create month modal
- Verify income pre-filled with correct amount
- Verify helper text shows

---

### 1.5 Pre-check Copy Checkbox by Default

**Problem:** Copy checkbox defaults to unchecked. Angular had it pre-checked when previous month existed.

**File to Modify:** `components/MonthSidebar.vue`

**Implementation:** Already covered in 1.4 watch function (line: `copyFromPrevious.value = !!selectedMonthId.value`)

**Testing:**
- Select a month, open create modal → checkbox should be checked
- First time user (no months) → checkbox should be unchecked

---

## Phase 2: Layout & Polish Improvements (30 minutes)

### 2.1 Remove Duplicate "Total Money Left" Display

**Problem:** "Total Money Left" appears in both Budget Summary sidebar AND floating bottom-right card. Redundant and creates visual clutter.

**User Choice:** Remove completely (summary sidebar is sufficient).

**File to Modify:** `pages/index.vue`

**Implementation Steps:**

1. **Delete floating card HTML** (delete lines 138-153):
   ```vue
   <!-- DELETE THIS ENTIRE SECTION -->
   <div v-if="currentMonth" class="fixed bottom-6 right-6 z-50">
     <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]">
       <div class="text-center">
         <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
           Total Money Left
         </h3>
         <p class="text-2xl font-bold text-green-600 dark:text-green-400">
           {{ totalMoneyLeft }}
         </p>
       </div>
     </div>
   </div>
   ```

2. **Delete totalMoneyLeft computed** (delete lines 173-176):
   ```typescript
   // DELETE THIS
   const totalMoneyLeft = computed(() => {
     if (!summary.value) return formatCurrency(0)
     return formatCurrency(summary.value.totalRemaining)
   })
   ```

**Testing:**
- Verify floating card no longer appears
- Verify Budget Summary sidebar still shows "Total Remaining"
- Test on mobile and desktop viewports

---

## Phase 3: Nice-to-Have Enhancements (2-3 hours)

### 3.1 Replace Browser Confirm with Custom Dialog

**Problem:** Native `confirm()` dialogs break visual consistency and are jarring.

**Files to Create:**
- `components/ConfirmDialog.vue` (new)
- `composables/useConfirm.ts` (new)

**Files to Modify:**
- `app.vue` or `layouts/default.vue` (add ConfirmDialog component)
- `components/TransactionList.vue` (line 225)
- `components/FixedPaymentsList.vue` (line 226)
- `components/BudgetCategoryCard.vue` (line 198)

**Implementation Steps:**

1. **Create ConfirmDialog.vue:**
   ```vue
   <template>
     <Teleport to="body">
       <Transition name="modal">
         <div
           v-if="isOpen"
           class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
           @click.self="handleCancel"
         >
           <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
             <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
               {{ title }}
             </h3>
             <p class="text-gray-600 dark:text-gray-400 mb-6">
               {{ message }}
             </p>
             <div class="flex justify-end space-x-3">
               <button
                 @click="handleCancel"
                 class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
               >
                 Cancel
               </button>
               <button
                 @click="handleConfirm"
                 class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
               >
                 {{ confirmText }}
               </button>
             </div>
           </div>
         </div>
       </Transition>
     </Teleport>
   </template>

   <script setup lang="ts">
   interface Props {
     isOpen: boolean
     title: string
     message: string
     confirmText?: string
   }

   withDefaults(defineProps<Props>(), {
     confirmText: 'Confirm',
   })

   const emit = defineEmits<{
     confirm: []
     cancel: []
   }>()

   const handleConfirm = () => emit('confirm')
   const handleCancel = () => emit('cancel')
   </script>

   <style scoped>
   .modal-enter-active,
   .modal-leave-active {
     transition: opacity 0.2s ease;
   }

   .modal-enter-from,
   .modal-leave-to {
     opacity: 0;
   }
   </style>
   ```

2. **Create useConfirm.ts composable:**
   ```typescript
   export const useConfirm = () => {
     const isOpen = ref(false)
     const title = ref('')
     const message = ref('')
     const confirmText = ref('Confirm')

     let resolvePromise: ((value: boolean) => void) | null = null

     const confirm = (options: {
       title: string
       message: string
       confirmText?: string
     }): Promise<boolean> => {
       title.value = options.title
       message.value = options.message
       confirmText.value = options.confirmText || 'Confirm'
       isOpen.value = true

       return new Promise((resolve) => {
         resolvePromise = resolve
       })
     }

     const handleConfirm = () => {
       isOpen.value = false
       resolvePromise?.(true)
       resolvePromise = null
     }

     const handleCancel = () => {
       isOpen.value = false
       resolvePromise?.(false)
       resolvePromise = null
     }

     return {
       isOpen,
       title,
       message,
       confirmText,
       confirm,
       handleConfirm,
       handleCancel,
     }
   }
   ```

3. **Add to app.vue:**
   ```vue
   <ConfirmDialog
     :is-open="confirmDialog.isOpen.value"
     :title="confirmDialog.title.value"
     :message="confirmDialog.message.value"
     :confirm-text="confirmDialog.confirmText.value"
     @confirm="confirmDialog.handleConfirm"
     @cancel="confirmDialog.handleCancel"
   />

   <script setup>
   const confirmDialog = useConfirm()
   provide('confirm', confirmDialog.confirm)
   </script>
   ```

4. **Replace confirm() calls in components:**
   ```typescript
   // Before:
   if (confirm('Are you sure you want to delete this transaction?')) {
     await deleteTransaction(id)
   }

   // After:
   const confirmFn = inject<(options: any) => Promise<boolean>>('confirm')
   const confirmed = await confirmFn({
     title: 'Delete Transaction',
     message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
     confirmText: 'Delete',
   })
   if (confirmed) {
     await deleteTransaction(id)
   }
   ```

**Testing:**
- Try deleting transactions, fixed payments, categories
- Verify custom modal appears instead of browser confirm
- Test both Confirm and Cancel actions

---

### 3.2 Add Example Placeholders

**Problem:** Input fields have generic placeholders like "Amount" instead of helpful examples.

**Files to Modify:**
- `components/TransactionList.vue`
- `components/FixedPaymentsList.vue`
- `components/BudgetCategoryCard.vue`
- `pages/index.vue`

**Examples:**
```vue
<!-- Transaction description -->
placeholder="e.g., Grocery shopping at Woolworths"

<!-- Fixed payment name -->
placeholder="e.g., Rent, Car Insurance, Netflix"

<!-- Category name -->
placeholder="e.g., Groceries, Entertainment, Transport"

<!-- Amount fields -->
placeholder="e.g., 2500.00"
```

**Testing:** Visual verification of placeholders

---

### 3.3 Enhance Empty States

**Problem:** Empty states are minimal with just text. Could be more engaging.

**Files to Modify:**
- `pages/index.vue` (categories empty state around line 117)
- `components/MonthSidebar.vue` (months empty state around line 22)
- `components/FixedPaymentsList.vue`
- `components/TransactionList.vue`

**Enhancements:**
- Add relevant icons (from Heroicons)
- Add descriptive subtext
- Emphasize call-to-action buttons
- Use color-coded boxes (light background with border)

**Example:**
```vue
<div class="text-center py-12 px-4">
  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
    <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <!-- Icon SVG -->
    </svg>
  </div>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
    No Budget Categories Yet
  </h3>
  <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
    Create your first budget category to start tracking where your money goes. Popular categories include Groceries, Transport, and Entertainment.
  </p>
  <button class="...">
    Add Your First Category
  </button>
</div>
```

**Testing:** Visual verification across all empty states

---

## Critical Files to Review Before Implementation

1. **`components/MonthSidebar.vue`** - Core file for month creation (185+ lines)
   - Handles: redundant name removal, sequential enforcement, income pre-fill, copy checkbox
   - Contains: create month modal, form logic, validation

2. **`components/TransactionList.vue`** - Transaction management (233 lines)
   - Handles: date picker implementation, add/edit forms
   - Contains: transaction CRUD, date validation logic

3. **`components/BudgetCategoryCard.vue`** - Category display (~200 lines)
   - Handles: pass month context to TransactionList
   - Contains: category header, collapsible transactions

4. **`pages/index.vue`** - Main page (160+ lines)
   - Handles: remove duplicate display, pass month props
   - Contains: layout, category grid, summary sidebar

5. **`utils/date.ts`** - Date utilities
   - Already has: `parseDate`, `formatDate`, `getMonthName`
   - May need: ISO date formatting helper

6. **`utils/currency.ts`** - Currency helpers
   - Already has: `formatCurrency`, `centsToRands`, `randsToCents`
   - No changes needed

---

## Implementation Order

**Recommended sequence (minimizes merge conflicts):**

1. **Phase 1.2** - Remove redundant month name (15 min)
   - Simplest, standalone change
   - Tests auto-generation logic

2. **Phase 1.5** - Pre-check copy checkbox (5 min)
   - Quick win, no dependencies

3. **Phase 1.4** - Pre-fill income (10 min)
   - Builds on 1.2 changes

4. **Phase 1.3** - Sequential month enforcement (45 min)
   - Combines with 1.2-1.4 changes
   - Complex computed logic

5. **Phase 2.1** - Remove duplicate display (15 min)
   - Independent, quick win

6. **Phase 1.1** - Transaction date picker (2-2.5 hours)
   - Most complex, requires prop drilling
   - Save for when fresh/focused

7. **Phase 3.1** - Custom confirm dialogs (1.5-2 hours)
   - Create reusable component
   - Replace all confirm() calls

8. **Phase 3.2** - Example placeholders (20 min)
   - Quick polish pass

9. **Phase 3.3** - Enhanced empty states (30-45 min)
   - Final polish

**Total Estimated Time:** 5.5-7.5 hours

---

## Testing Checklist

### After Phase 1:
- [ ] Transaction date picker appears in add/edit forms
- [ ] Date picker constrained to month boundaries
- [ ] Transactions can be created with custom dates
- [ ] Transaction dates persist after editing
- [ ] Month creation modal has no manual name input
- [ ] Month name preview updates when year/month change
- [ ] Created months have correct auto-generated names
- [ ] Non-sequential month shows warning
- [ ] Override checkbox enables submit button
- [ ] Income pre-fills from current month
- [ ] Copy checkbox pre-checked when month exists

### After Phase 2:
- [ ] Floating "Total Money Left" card removed
- [ ] Summary sidebar still shows "Total Remaining"
- [ ] Layout looks clean on mobile and desktop

### After Phase 3:
- [ ] Custom confirm dialog appears for all deletes
- [ ] Confirm/Cancel both work correctly
- [ ] All input placeholders show helpful examples
- [ ] Empty states have icons and descriptive text
- [ ] Empty states look polished and professional

---

## Rollback Plan

If any phase causes issues:

1. **Phase 1.1 (Date Picker):** Revert prop additions to BudgetCategoryCard and pages/index.vue, transactions will auto-timestamp
2. **Phase 1.2-1.5 (Month Creation):** Revert MonthSidebar.vue changes, users manually enter month name
3. **Phase 2.1 (Duplicate Display):** Re-add floating card HTML and computed property
4. **Phase 3:** All Phase 3 changes are additive and can be reverted individually

---

## Post-Implementation

### Additional Monitoring:
- Watch for user feedback on sequential month enforcement (too strict?)
- Monitor if custom confirm dialogs need more features (e.g., dangerous actions in different color)
- Consider analytics on how often users override sequential months

### Future Enhancements Not In Scope:
- Drag-and-drop category reordering
- Bulk transaction operations
- Transaction search/filtering
- Budget templates
- Data export (CSV/Excel)
- Category color customization
- Fixed payment due date tracking
- Keyboard shortcuts

---

## Success Metrics

**Phase 1 Success:**
- Users can create transactions with accurate dates
- Month creation is intuitive (no manual name typing)
- Sequential budgeting is encouraged but flexible
- Income entry is faster (pre-filled)

**Phase 2 Success:**
- UI is cleaner without duplicate information
- No confusion about which "total" to trust

**Phase 3 Success:**
- Confirmation dialogs feel native to the app
- New users understand what to do (better empty states)
- Input fields provide helpful guidance (examples)

---

## Notes

- **Currency bug already fixed:** Previous BUG-FIXES.md shows currency conversion issue was resolved
- **No database migrations needed:** Schema already supports all features
- **Keep Nuxt improvements:** Inline editing, progress bars, sticky summary sidebar are superior to Angular
- **Dark mode compatibility:** All new UI elements must support dark mode classes
- **Mobile responsive:** Test all changes on mobile viewport (especially date pickers)
