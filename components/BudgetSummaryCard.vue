<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Budget Summary
    </h2>

    <LoadingSpinner v-if="isLoadingSummary" class="my-8" />

    <ErrorAlert v-else-if="budgetError" :message="budgetError" />

    <div v-else-if="summary" class="space-y-4">
      <!-- Income -->
      <div class="flex items-center justify-between py-2">
        <span class="text-gray-700 dark:text-gray-300 font-medium">Monthly Income</span>
        <span class="text-lg font-bold text-green-600 dark:text-green-400">
          {{ formatCurrency(centsToRands(summary.income)) }}
        </span>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700"></div>

      <!-- Fixed Payments -->
      <div class="flex items-center justify-between py-2">
        <span class="text-gray-700 dark:text-gray-300">Fixed Payments</span>
        <span class="text-gray-900 dark:text-white font-semibold">
          -{{ formatCurrency(centsToRands(summary.totalFixedPayments)) }}
        </span>
      </div>

      <!-- Available after fixed -->
      <div class="flex items-center justify-between py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 -mx-3">
        <span class="text-blue-700 dark:text-blue-300 font-medium">Available After Fixed</span>
        <span class="text-lg font-bold text-blue-600 dark:text-blue-400">
          {{ formatCurrency(centsToRands(summary.availableAfterFixed)) }}
        </span>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700"></div>

      <!-- Budgeted -->
      <div class="flex items-center justify-between py-2">
        <span class="text-gray-700 dark:text-gray-300">Total Budgeted</span>
        <span class="text-gray-900 dark:text-white font-semibold">
          -{{ formatCurrency(centsToRands(summary.totalBudgeted)) }}
        </span>
      </div>

      <!-- Available after budgets -->
      <div class="flex items-center justify-between py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 -mx-3">
        <span class="text-purple-700 dark:text-purple-300 font-medium">Available After Budgets</span>
        <span class="text-lg font-bold text-purple-600 dark:text-purple-400">
          {{ formatCurrency(centsToRands(summary.availableAfterBudgets)) }}
        </span>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700"></div>

      <!-- Spent -->
      <div class="flex items-center justify-between py-2">
        <span class="text-gray-700 dark:text-gray-300">Total Spent</span>
        <span class="text-gray-900 dark:text-white font-semibold">
          -{{ formatCurrency(centsToRands(summary.totalSpent)) }}
        </span>
      </div>

      <div class="border-t-2 border-gray-300 dark:border-gray-600"></div>

      <!-- Total Remaining -->
      <div class="flex items-center justify-between py-2">
        <span class="text-gray-900 dark:text-white font-bold text-lg">Total Remaining</span>
        <span
          :class="[
            'text-2xl font-bold',
            summary.totalRemaining >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          ]"
        >
          {{ formatCurrency(centsToRands(summary.totalRemaining)) }}
        </span>
      </div>

      <!-- Category Breakdown -->
      <div v-if="summary.categories && summary.categories.length > 0" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Category Breakdown
        </h3>
        <ul class="space-y-2">
          <li
            v-for="category in summary.categories"
            :key="category.categoryId"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-gray-700 dark:text-gray-300">{{ category.categoryName }}</span>
            <div class="flex items-center space-x-2">
              <span class="text-gray-600 dark:text-gray-400 text-xs">
                {{ formatCurrency(centsToRands(category.spent)) }} / {{ formatCurrency(centsToRands(category.allocated)) }}
              </span>
              <span
                :class="[
                  'font-medium',
                  category.remaining >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                ]"
              >
                {{ formatCurrency(centsToRands(Math.abs(category.remaining))) }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
      No summary data available
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency, centsToRands } from '~/utils/currency'

const { summary, isLoadingSummary, budgetError, fetchSummary } = useBudget()
const { selectedMonthId } = useMonths()

// Fetch summary when month changes
watch(selectedMonthId, (newId) => {
  if (newId) {
    fetchSummary(newId)
  }
}, { immediate: true })
</script>
