<script setup lang="ts">
import { MONTH_NAMES } from '~/types/yearly'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'copy', sourceMonth: number, targetMonth: number, resetPaidStatus: boolean): void
}>()

const { copyFromMonth, getTotalExpensesForMonth } = useYearlyCategories()
const { getTotalGrossForMonth } = useYearlyIncome()

const sourceMonth = ref(1)
const targetMonth = ref(2)
const resetPaidStatus = ref(true)

// Find the last month that has any values (expenses or income)
function findLastMonthWithValues(): number {
  for (let month = 12; month >= 1; month--) {
    const expenses = getTotalExpensesForMonth(month)
    const income = getTotalGrossForMonth(month)
    if (expenses > 0 || income > 0) {
      return month
    }
  }
  return 1 // Default to January if no values found
}

// Check if target month has any values
const targetMonthHasValues = computed(() => {
  const expenses = getTotalExpensesForMonth(targetMonth.value)
  const income = getTotalGrossForMonth(targetMonth.value)
  return expenses > 0 || income > 0
})

// Set smart defaults when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    const lastMonthWithValues = findLastMonthWithValues()
    sourceMonth.value = lastMonthWithValues
    // Target is next month, or same month if December
    targetMonth.value = lastMonthWithValues < 12 ? lastMonthWithValues + 1 : 12
  }
})

// Auto-set source to previous month of target
watch(targetMonth, (newTarget) => {
  if (newTarget > 1) {
    sourceMonth.value = newTarget - 1
  }
})

function handleCopy() {
  if (sourceMonth.value === targetMonth.value) {
    return // Already showing inline validation message
  }

  // Fire and close - optimistic update happens immediately, API runs in background
  // Errors are handled via toast in the composable
  copyFromMonth({
    sourceMonth: sourceMonth.value,
    targetMonth: targetMonth.value,
    resetPaidStatus: resetPaidStatus.value,
  })
  emit('close')
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click="handleBackdropClick"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Copy Month Data</h2>
          <button
            @click="emit('close')"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Copy all category amounts from one month to another.
          </p>

          <!-- Source Month -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Copy from (source)
            </label>
            <select
              v-model="sourceMonth"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option v-for="(name, index) in MONTH_NAMES" :key="index" :value="index + 1">
                {{ name }}
              </option>
            </select>
          </div>

          <!-- Target Month -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Copy to (target)
            </label>
            <select
              v-model="targetMonth"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option v-for="(name, index) in MONTH_NAMES" :key="index" :value="index + 1">
                {{ name }}
              </option>
            </select>
          </div>

          <!-- Reset Paid Status -->
          <div class="flex items-center gap-2">
            <input
              id="reset-paid"
              v-model="resetPaidStatus"
              type="checkbox"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="reset-paid" class="text-sm text-gray-700 dark:text-gray-300">
              Reset paid status (uncheck all items)
            </label>
          </div>

          <!-- Warning if same month -->
          <p
            v-if="sourceMonth === targetMonth"
            class="text-sm text-red-500"
          >
            Source and target months cannot be the same.
          </p>

          <!-- Warning if target month has values -->
          <div
            v-if="targetMonthHasValues && sourceMonth !== targetMonth"
            class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
          >
            <p class="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>
                <strong>{{ MONTH_NAMES[targetMonth - 1] }}</strong> already has data.
                Copying will overwrite existing values.
              </span>
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            @click="handleCopy"
            :disabled="sourceMonth === targetMonth"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg"
          >
            Copy Month
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
