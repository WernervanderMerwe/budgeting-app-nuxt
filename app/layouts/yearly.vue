<template>
  <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
    <!-- Main Content - Full Width -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

    <!-- Footer with Year Pagination -->
    <footer class="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-center space-x-4">
          <button
            @click="goToPreviousYear"
            class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            &larr; {{ selectedYear - 1 }}
          </button>
          <span class="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg">
            {{ selectedYear }}
          </span>
          <button
            @click="goToNextYear"
            class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {{ selectedYear + 1 }} &rarr;
          </button>
        </div>
      </div>
    </footer>

    <!-- Global Confirm Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
const { selectedYear, selectYear } = useYearlyBudget()

function goToPreviousYear() {
  selectYear(selectedYear.value - 1)
}

function goToNextYear() {
  selectYear(selectedYear.value + 1)
}
</script>
