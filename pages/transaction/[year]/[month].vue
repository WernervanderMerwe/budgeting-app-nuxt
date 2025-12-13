<script setup lang="ts">
import { getMonthName } from '~/utils/date'

useHead({
  title: 'Transaction Tracker'
})

const route = useRoute()
const router = useRouter()

const {
  months,
  currentMonth,
  selectedMonthId,
  hasMonths,
  isLoadingMonths,
  fetchMonths,
  selectMonth,
} = useMonths()
const { createCategory } = useBudget()

const showAddCategoryForm = ref(false)
const isAddingCategory = ref(false)

const newCategory = ref({
  name: '',
  allocatedAmount: 0,
})

// Get year/month from route params
const yearFromRoute = computed(() => {
  const year = parseInt(route.params.year as string, 10)
  return isNaN(year) ? null : year
})

const monthFromRoute = computed(() => {
  const month = parseInt(route.params.month as string, 10)
  return isNaN(month) || month < 1 || month > 12 ? null : month
})

// Find and load the month based on route params
async function loadMonthFromRoute() {
  if (!yearFromRoute.value || !monthFromRoute.value) return

  // Ensure months are loaded
  if (months.value.length === 0) {
    await fetchMonths()
  }

  // Find the month matching year/month
  const targetMonth = months.value.find(
    m => m.year === yearFromRoute.value && m.month === monthFromRoute.value
  )

  if (targetMonth) {
    await selectMonth(targetMonth.id)
  } else {
    // Month not found, redirect to index
    router.replace('/transaction')
  }
}

// Load on mount
onMounted(async () => {
  await loadMonthFromRoute()
})

// Watch for route changes
watch(
  () => [route.params.year, route.params.month],
  async () => {
    await loadMonthFromRoute()
  }
)

// Provide month change handler for sidebar
function handleMonthChange(monthId: number) {
  const month = months.value.find(m => m.id === monthId)
  if (month) {
    router.push(`/transaction/${month.year}/${month.month}`)
  }
}

provide('onMonthChange', handleMonthChange)

const handleAddCategory = async () => {
  if (!currentMonth.value) return

  isAddingCategory.value = true
  try {
    await createCategory({
      monthId: currentMonth.value.id,
      name: newCategory.value.name,
      allocatedAmount: newCategory.value.allocatedAmount,
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

<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoadingMonths || !currentMonth" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>

    <!-- Month Content -->
    <div v-else>
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
          <div class="flex gap-3 mb-4">
            <div class="flex-1">
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
            <div class="w-40">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount (R)
              </label>
              <input
                v-model.number="newCategory.allocatedAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 5000.00"
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

          <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 border border-gray-200 dark:border-gray-700 text-center">
            <svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p class="text-gray-600 dark:text-gray-300 font-medium mb-2">
              No budget categories yet
            </p>
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              Create your first budget category to start tracking expenses
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
  </div>
</template>
