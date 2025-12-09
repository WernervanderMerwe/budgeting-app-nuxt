<script setup lang="ts">
import { MONTH_NAMES_SHORT } from '~/types/yearly'

definePageMeta({
  layout: 'yearly'
})

const {
  currentBudget,
  selectedYear,
  loading,
  error,
  hasBudget,
  fetchBudgetByYear,
  getOrCreateBudgetForYear,
} = useYearlyBudget()

const {
  sections,
  createCategory,
  updateCategoryEntry,
  deleteCategory,
} = useYearlyCategories()

const { createIncomeSource } = useYearlyIncome()

// Modal state
const showCopyModal = ref(false)
const showAddCategoryModal = ref(false)
const addCategoryForSectionId = ref<number | null>(null)
const newCategoryName = ref('')

// Load budget on mount
onMounted(async () => {
  await fetchBudgetByYear(selectedYear.value)
})

// Create budget if it doesn't exist
async function handleCreateBudget() {
  await getOrCreateBudgetForYear(selectedYear.value)
}

// Add category handlers
function openAddCategoryModal(sectionId: number) {
  addCategoryForSectionId.value = sectionId
  newCategoryName.value = ''
  showAddCategoryModal.value = true
}

async function handleAddCategory() {
  if (!newCategoryName.value.trim() || !addCategoryForSectionId.value) return
  await createCategory({
    sectionId: addCategoryForSectionId.value,
    name: newCategoryName.value.trim(),
  })
  showAddCategoryModal.value = false
  newCategoryName.value = ''
  addCategoryForSectionId.value = null
}

async function handleAddSubcategory(parentId: number) {
  const name = prompt('Enter subcategory name:')
  if (!name?.trim()) return
  // Find parent category to get sectionId
  for (const section of sections.value) {
    const parent = section.categories.find(c => c.id === parentId)
    if (parent) {
      await createCategory({
        sectionId: section.id,
        name: name.trim(),
        parentId,
      })
      break
    }
  }
}

async function handleUpdateEntry(entryId: number, data: { amount?: number; isPaid?: boolean }) {
  await updateCategoryEntry(entryId, data)
}

async function handleDeleteCategory(categoryId: number) {
  if (confirm('Are you sure you want to delete this category?')) {
    await deleteCategory(categoryId)
  }
}

async function handleAddIncomeSource() {
  const name = prompt('Enter income source name (e.g., Salary, Side Hustle):')
  if (!name?.trim() || !currentBudget.value) return
  await createIncomeSource({
    yearlyBudgetId: currentBudget.value.id,
    name: name.trim(),
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <YearlyYearlyHeader @open-copy-modal="showCopyModal = true" />

    <!-- Main Content -->
    <main class="pb-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600 dark:text-gray-400">Loading budget...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
        <div class="text-center">
          <p class="text-red-500 mb-4">{{ error }}</p>
          <button
            @click="fetchBudgetByYear(selectedYear)"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- No Budget State -->
      <div v-else-if="!hasBudget" class="flex items-center justify-center min-h-[60vh]">
        <div class="text-center max-w-md">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg class="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Budget for {{ selectedYear }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Create a new yearly budget to start tracking your finances with the 70/20/10 rule.
          </p>
          <button
            @click="handleCreateBudget"
            class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            Create {{ selectedYear }} Budget
          </button>
        </div>
      </div>

      <!-- Budget View -->
      <div v-else class="overflow-x-auto">
        <!-- Month Headers -->
        <div class="sticky top-[57px] z-40 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div class="flex">
            <div class="sticky left-0 z-10 min-w-[200px] w-[200px] px-3 py-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
              <span class="text-sm font-medium text-gray-500"></span>
            </div>
            <div class="flex flex-1">
              <div
                v-for="(month, index) in MONTH_NAMES_SHORT"
                :key="index"
                class="flex-1 min-w-[100px] px-2 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                {{ month }}
              </div>
            </div>
          </div>
        </div>

        <!-- Sections -->
        <div class="p-4 space-y-4">
          <!-- Income Section -->
          <YearlyIncomeSection @add-source="handleAddIncomeSource" />

          <!-- Budget Sections (70/20/10) -->
          <YearlyBudgetSection
            v-for="section in sections"
            :key="section.id"
            :section="section"
            :show-warnings="currentBudget?.showWarnings"
            @add-category="openAddCategoryModal"
            @update-entry="handleUpdateEntry"
            @delete-category="handleDeleteCategory"
            @add-subcategory="handleAddSubcategory"
          />

          <!-- Summary Footer -->
          <YearlySummaryFooter />
        </div>
      </div>
    </main>

    <!-- Copy Month Modal -->
    <YearlyCopyMonthModal
      :is-open="showCopyModal"
      @close="showCopyModal = false"
    />

    <!-- Add Category Modal -->
    <Teleport to="body">
      <div
        v-if="showAddCategoryModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showAddCategoryModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Category</h3>
          <input
            v-model="newCategoryName"
            type="text"
            placeholder="Category name"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            @keydown.enter="handleAddCategory"
          />
          <div class="flex justify-end gap-2">
            <button
              @click="showAddCategoryModal = false"
              class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              @click="handleAddCategory"
              class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
