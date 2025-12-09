<script setup lang="ts">
const { selectedYear, availableYears, selectYear, createBudget } = useYearlyBudget()

const currentYear = new Date().getFullYear()

// Generate year options (5 years back, 2 years forward)
const yearOptions = computed(() => {
  const years = new Set<number>()
  // Add available years from budgets
  availableYears.value.forEach(y => years.add(y))
  // Add range around current year
  for (let i = currentYear - 5; i <= currentYear + 2; i++) {
    years.add(i)
  }
  return Array.from(years).sort((a, b) => b - a)
})

async function handleYearChange(event: Event) {
  const year = parseInt((event.target as HTMLSelectElement).value)
  await selectYear(year)
}

async function handlePrevYear() {
  await selectYear(selectedYear.value - 1)
}

async function handleNextYear() {
  await selectYear(selectedYear.value + 1)
}

async function handleCreateYear() {
  await createBudget({ year: selectedYear.value })
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      @click="handlePrevYear"
      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Previous year"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    </button>

    <select
      :value="selectedYear"
      @change="handleYearChange"
      class="px-4 py-2 text-lg font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option v-for="year in yearOptions" :key="year" :value="year">
        {{ year }}
      </option>
    </select>

    <button
      @click="handleNextYear"
      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Next year"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>
