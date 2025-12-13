<script setup lang="ts">
import { MONTH_NAMES } from '~/types/yearly'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'cleared'): void
}>()

const { currentBudget, fetchBudgetById } = useYearlyBudget()
const { getTotalExpensesForMonth } = useYearlyCategories()
const { getTotalGrossForMonth } = useYearlyIncome()

const selectedMonth = ref(1)
const resetPaidStatus = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

// Check if selected month has any values
const monthHasValues = computed(() => {
  const expenses = getTotalExpensesForMonth(selectedMonth.value)
  const income = getTotalGrossForMonth(selectedMonth.value)
  return expenses > 0 || income > 0
})

// Clear error when month changes
watch(selectedMonth, () => {
  errorMessage.value = ''
})

async function handleClear() {
  errorMessage.value = ''

  if (!currentBudget.value) return

  isLoading.value = true
  try {
    await $fetch(`/api/yearly/${currentBudget.value.id}/clear-month`, {
      method: 'POST',
      body: {
        month: selectedMonth.value,
        resetPaidStatus: resetPaidStatus.value,
      },
    })
    // Refresh the budget data
    await fetchBudgetById(currentBudget.value.id, false)
    emit('cleared')
    emit('close')
  } catch (error) {
    console.error('Error clearing month:', error)
    errorMessage.value = 'Failed to clear month data. Please try again.'
  } finally {
    isLoading.value = false
  }
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
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Clear Month Data</h2>
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
            Reset all category amounts, income, and deductions for a month to zero.
          </p>

          <!-- Month Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Month to clear
            </label>
            <select
              v-model="selectedMonth"
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
              id="clear-reset-paid"
              v-model="resetPaidStatus"
              type="checkbox"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="clear-reset-paid" class="text-sm text-gray-700 dark:text-gray-300">
              Reset paid status (uncheck all items)
            </label>
          </div>

          <!-- Warning if month has no values -->
          <p
            v-if="!monthHasValues"
            class="text-sm text-yellow-600 dark:text-yellow-400"
          >
            This month has no values to clear.
          </p>

          <!-- Warning if month has values -->
          <div
            v-if="monthHasValues"
            class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <p class="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>
                <strong>{{ MONTH_NAMES[selectedMonth - 1] }}</strong> has existing data.
                This action will reset all amounts to zero and cannot be undone.
              </span>
            </p>
          </div>

          <!-- API Error Message -->
          <p
            v-if="errorMessage"
            class="text-sm text-red-500"
          >
            {{ errorMessage }}
          </p>
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
            @click="handleClear"
            :disabled="isLoading || !monthHasValues"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg"
          >
            {{ isLoading ? 'Clearing...' : 'Clear Month' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
