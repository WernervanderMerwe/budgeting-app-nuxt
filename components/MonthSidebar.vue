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

      <div v-else-if="!hasMonths" class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        No months yet. Create your first month to get started.
      </div>

      <ul v-else class="space-y-1">
        <li v-for="month in sortedMonths" :key="month.id">
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
              <!-- Month Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Month Name
                </label>
                <input
                  v-model="newMonth.name"
                  type="text"
                  placeholder="e.g., January 2025"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

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
                  placeholder="0.00"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
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
                :disabled="isCreating"
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
import { getCurrentYear, getCurrentMonth } from '~/utils/date'

const {
  sortedMonths,
  selectedMonthId,
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
  name: '',
  year: getCurrentYear(),
  month: getCurrentMonth(),
  income: 0,
})

const handleCreateMonth = async () => {
  isCreating.value = true
  try {
    const created = await createMonth({
      name: newMonth.value.name,
      year: newMonth.value.year,
      month: newMonth.value.month,
      income: newMonth.value.income,
      copyFromMonthId: copyFromPrevious.value ? selectedMonthId.value : undefined,
    })

    showCreateModal.value = false

    // Reset form
    newMonth.value = {
      name: '',
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
