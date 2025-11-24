<template>
  <div>
    <!-- Welcome / No Month Selected State -->
    <div v-if="!selectedMonthId" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="mb-6">
          <svg class="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Budget Tracker
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ hasMonths ? 'Select a month from the sidebar to get started' : 'Create your first month to start budgeting' }}
        </p>
      </div>
    </div>

    <!-- Month Content -->
    <div v-else-if="currentMonth">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ currentMonth.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage your budget for {{ getMonthName(currentMonth.month) }} {{ currentMonth.year }}
        </p>
      </div>

      <!-- Add Category Button -->
      <div class="mb-6">
        <button
          v-if="!showAddCategoryForm"
          @click="showAddCategoryForm = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Budget Category</span>
        </button>

        <!-- Add Category Form -->
        <form v-else @submit.prevent="handleAddCategory" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-3">New Budget Category</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Name
              </label>
              <input
                v-model="newCategory.name"
                type="text"
                placeholder="e.g., Groceries"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budgeted Amount (R)
              </label>
              <input
                v-model.number="newCategory.allocatedAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="cancelAddCategory"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isAddingCategory"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isAddingCategory ? 'Adding...' : 'Add Category' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Budget Items -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Income Card -->
          <IncomeCard :month="currentMonth" />

          <!-- Fixed Payments -->
          <FixedPaymentsList
            :month-id="currentMonth.id"
            :fixed-payments="currentMonth.fixedPayments"
          />

          <!-- Budget Categories -->
          <div v-if="currentMonth.categories.length > 0" class="space-y-4">
            <BudgetCategoryCard
              v-for="category in currentMonth.categories"
              :key="category.id"
              :category="category"
            />
          </div>

          <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 border border-gray-200 dark:border-gray-700 text-center">
            <p class="text-gray-500 dark:text-gray-400">
              No budget categories yet. Add one to start tracking your expenses.
            </p>
          </div>
        </div>

        <!-- Right Column - Summary -->
        <div class="lg:col-span-1">
          <div class="sticky top-6">
            <BudgetSummaryCard />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getMonthName } from '~/utils/date'
import { randsToCents } from '~/utils/currency'

const { currentMonth, selectedMonthId, hasMonths } = useMonths()
const { createCategory } = useBudget()

const showAddCategoryForm = ref(false)
const isAddingCategory = ref(false)

const newCategory = ref({
  name: '',
  allocatedAmount: 0,
})

const handleAddCategory = async () => {
  if (!currentMonth.value) return

  isAddingCategory.value = true
  try {
    await createCategory({
      monthId: currentMonth.value.id,
      name: newCategory.value.name,
      allocatedAmount: randsToCents(newCategory.value.allocatedAmount),
    })
    cancelAddCategory()
  } catch (error) {
    console.error('Failed to add category:', error)
  } finally {
    isAddingCategory.value = false
  }
}

const cancelAddCategory = () => {
  showAddCategoryForm.value = false
  newCategory.value = { name: '', allocatedAmount: 0 }
}
</script>
