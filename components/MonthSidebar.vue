<template>
  <aside class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
    <!-- Sidebar Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <button
        @click="showCreateModal = true"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>New Month</span>
      </button>
    </div>

    <!-- Months List -->
    <div class="flex-1 overflow-y-auto p-2">
      <LoadingSpinner v-if="isLoadingMonths" class="my-8" />

      <ErrorAlert v-else-if="monthsError" :message="monthsError" />

      <div v-else-if="!hasMonths" class="p-6 text-center">
        <svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">No months yet</p>
        <p class="text-gray-500 dark:text-gray-500 text-xs">Create your first month to get started</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="year in years" :key="year">
          <!-- Year Header -->
          <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {{ year }}
          </div>

          <!-- Months for this year -->
          <ul class="space-y-1">
            <li v-for="month in monthsByYear[year]" :key="month.id">
              <button
                @click="selectMonth(month.id)"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg transition-colors',
                  selectedMonthId === month.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
              >
                <div class="flex items-center justify-between">
                  <span>{{ month.displayName }}</span>
                  <svg
                    v-if="selectedMonthId === month.id"
                    class="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Create Month Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="showCreateModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Create New Month
          </h2>

          <form @submit.prevent="handleCreateMonth">
            <div class="space-y-4">
              <!-- Year -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year
                </label>
                <input
                  v-model.number="newMonth.year"
                  type="number"
                  min="2000"
                  max="2100"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <!-- Month (1-12) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Month
                </label>
                <select
                  v-model.number="newMonth.month"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              <!-- Auto-generated name preview -->
              <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p class="text-sm text-blue-700 dark:text-blue-300">
                  <span class="font-medium">Creating:</span> {{ generatedMonthName }}
                </p>
              </div>

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

              <!-- Income -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monthly Income (R)
                </label>
                <input
                  v-model.number="newMonth.income"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 45000.00"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p v-if="previousMonthIncome > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pre-filled from current month (R {{ previousMonthIncome.toFixed(2) }})
                </p>
              </div>

              <!-- Copy from Previous Month -->
              <div v-if="selectedMonthId" class="flex items-start space-x-2">
                <input
                  id="copyFromPrevious"
                  v-model="copyFromPrevious"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="flex-1">
                  <label for="copyFromPrevious" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Copy payments and budgets from current month
                  </label>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will copy your fixed payments and budget categories (without transactions) to the new month
                  </p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isCreating || (hasMonths && !isValidMonthSelection && !overrideSequential)"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isCreating ? 'Creating...' : 'Create Month' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { getCurrentYear, getCurrentMonth, getMonthName } from '~/utils/date'
import { centsToRands } from '~/utils/currency'

const {
  sortedMonths,
  monthsByYear,
  years,
  selectedMonthId,
  currentMonth,
  isLoadingMonths,
  monthsError,
  hasMonths,
  fetchMonths,
  selectMonth,
  createMonth,
} = useMonths()

const showCreateModal = ref(false)
const isCreating = ref(false)
const copyFromPrevious = ref(false)

const newMonth = ref({
  year: getCurrentYear(),
  month: getCurrentMonth(),
  income: 0,
})

const generatedMonthName = computed(() => {
  return `${getMonthName(newMonth.value.month)} ${newMonth.value.year}`
})

const previousMonthIncome = computed(() => {
  if (!currentMonth.value) return 0
  return centsToRands(currentMonth.value.income)
})

// Sequential month validation
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

const overrideSequential = ref(false)

// Watch modal open/close to set smart defaults
watch(showCreateModal, (isOpen) => {
  if (isOpen) {
    // Pre-fill income from current month
    newMonth.value.income = previousMonthIncome.value

    // Pre-check copy checkbox if a month is currently selected
    copyFromPrevious.value = !!selectedMonthId.value

    if (hasMonths.value) {
      // Auto-set to next sequential month
      newMonth.value.year = nextValidMonth.value.year
      newMonth.value.month = nextValidMonth.value.month
    }
  }
  if (!isOpen) {
    // Reset on close
    copyFromPrevious.value = false
    overrideSequential.value = false
  }
})

const handleCreateMonth = async () => {
  isCreating.value = true
  try {
    const created = await createMonth({
      name: generatedMonthName.value,
      year: newMonth.value.year,
      month: newMonth.value.month,
      income: newMonth.value.income,
      copyFromMonthId: copyFromPrevious.value && selectedMonthId.value ? selectedMonthId.value : undefined,
    })

    showCreateModal.value = false

    // Reset form
    newMonth.value = {
      year: getCurrentYear(),
      month: getCurrentMonth(),
      income: 0,
    }
    copyFromPrevious.value = false

    // Select the newly created month
    await selectMonth(created.id)
  } catch (error) {
    console.error('Failed to create month:', error)
  } finally {
    isCreating.value = false
  }
}

// Fetch months on mount
onMounted(() => {
  fetchMonths()
})
</script>
