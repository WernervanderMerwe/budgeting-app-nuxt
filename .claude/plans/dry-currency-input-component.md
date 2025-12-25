# DRY Currency Input Validation Plan

## Problem
Currency inputs are duplicated across 6+ components with no shared validation for max 2 decimal places.

## Solution: Reusable `CurrencyInput.vue` Component

### Component Features
- Max 2 decimal place validation (real-time as user types)
- `v-model` support for easy integration
- Consistent styling with existing inputs
- Optional label, placeholder, required, disabled props
- `inputmode="decimal"` for mobile keyboards

---

## Implementation

### Step 1: Create `components/CurrencyInput.vue`

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  class?: string
}>(), {
  placeholder: 'e.g., 1000.00',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const inputValue = ref('')

// Sync inputValue with modelValue
watch(() => props.modelValue, (newVal) => {
  if (document.activeElement !== inputRef.value) {
    inputValue.value = newVal === 0 ? '' : newVal.toFixed(2)
  }
}, { immediate: true })

const inputRef = ref<HTMLInputElement | null>(null)

// Sanitize input: only numbers, one decimal, max 2 decimal places
function handleInput(event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value

  // Remove non-numeric except . and ,
  value = value.replace(/[^\d.,]/g, '')

  // Only allow one decimal separator
  const parts = value.split(/[.,]/)
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }

  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].slice(0, 2)
  }

  inputValue.value = value

  // Emit parsed number
  const parsed = parseFloat(value.replace(',', '.')) || 0
  emit('update:modelValue', Math.round(parsed * 100) / 100)
}

function handleBlur() {
  // Format on blur
  const parsed = parseFloat(inputValue.value.replace(',', '.')) || 0
  inputValue.value = parsed === 0 ? '' : parsed.toFixed(2)
}
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
    </label>
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      inputmode="decimal"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="[
        'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.class
      ]"
      @input="handleInput"
      @blur="handleBlur"
    />
  </div>
</template>
```

---

### Step 2: Replace Inputs in Components

| Component | Replace With |
|-----------|--------------|
| `IncomeCard.vue` | `<CurrencyInput v-model="editedIncome" label="Income Amount (R)" />` |
| `FixedPaymentsList.vue` | `<CurrencyInput v-model="newPayment.amount" />` (2 places) |
| `BudgetCategoryCard.vue` | `<CurrencyInput v-model="editedCategory.allocatedAmount" />` |
| `TransactionList.vue` | `<CurrencyInput v-model="newTransaction.amount" />` (2 places) |
| `MonthSidebar.vue` | `<CurrencyInput v-model="newMonth.income" label="Monthly Income (R)" />` |
| `pages/transaction/[year]/[month].vue` | `<CurrencyInput v-model="newCategory.allocatedAmount" label="Amount (R)" />` |

---

### Step 3: Update YearlyMonthCell (Already Has Validation)

The `MonthCell.vue` already has similar validation. Just ensure it uses the same `handleInput` logic for consistency.

---

## Files to Modify

1. **Create:** `components/CurrencyInput.vue`
2. **Update:** `components/IncomeCard.vue`
3. **Update:** `components/FixedPaymentsList.vue`
4. **Update:** `components/BudgetCategoryCard.vue`
5. **Update:** `components/TransactionList.vue`
6. **Update:** `components/MonthSidebar.vue`
7. **Update:** `pages/transaction/[year]/[month].vue`

---

## Benefits

- **DRY:** Single source of truth for currency input behavior
- **Consistent UX:** Same validation across all inputs
- **Maintainable:** Fix bugs or add features in one place
- **Type-safe:** Props are typed with TypeScript
