<script setup lang="ts">
import { MONTH_NAMES_SHORT } from '~/types/yearly'
import { COLUMN_WIDTH_KEY, useColumnResize } from '~/composables/useColumnResize'
import { getCurrentYear } from '~/utils/date'

definePageMeta({
  layout: 'yearly'
})

useHead({
  title: 'Yearly Overview'
})

const route = useRoute()
const router = useRouter()

const {
  currentBudget,
  selectedYear,
  loading,
  error,
  hasBudget,
  fetchBudgetByYear,
  getOrCreateBudgetForYear,
  selectYear,
} = useYearlyBudget()

const {
  sections,
  createCategory,
  updateCategory,
  updateCategoryEntry,
  deleteCategory,
  checkAllChildrenForCategory,
  checkAllCategoriesForSection,
} = useYearlyCategories()

const { createIncomeSource } = useYearlyIncome()
const { openDialog } = useConfirmDialog()

// Column resize functionality
const { columnWidth, startResize } = useColumnResize()
provide(COLUMN_WIDTH_KEY, columnWidth)

// Modal state
const showCopyModal = ref(false)
const showClearModal = ref(false)
const showAddCategoryModal = ref(false)
const addCategoryForSectionId = ref<number | null>(null)
const newCategoryName = ref('')
const showAddIncomeSourceModal = ref(false)
const newIncomeSourceName = ref('')
const showAddSubcategoryModal = ref(false)
const addSubcategoryParentId = ref<number | null>(null)
const newSubcategoryName = ref('')

// Get year from route params
const yearFromRoute = computed(() => {
  const year = parseInt(route.params.year as string, 10)
  return isNaN(year) ? getCurrentYear() : year
})

// Load budget on mount and when year changes
onMounted(async () => {
  await selectYear(yearFromRoute.value)
})

// Watch for route param changes
watch(() => route.params.year, async (newYear) => {
  if (newYear) {
    const year = parseInt(newYear as string, 10)
    if (!isNaN(year)) {
      await selectYear(year)
    }
  }
})

// Handle year change from YearSelector - update URL
function handleYearChange(year: number) {
  router.push(`/yearly/${year}`)
}

// Provide the year change handler
provide('onYearChange', handleYearChange)

// Create budget if it doesn't exist
async function handleCreateBudget() {
  await getOrCreateBudgetForYear(yearFromRoute.value)
}

// Add category handlers
function openAddCategoryModal(sectionId: number) {
  addCategoryForSectionId.value = sectionId
  newCategoryName.value = ''
  showAddCategoryModal.value = true
}

async function handleAddCategory() {
  if (!newCategoryName.value.trim() || !addCategoryForSectionId.value) return
  // Capture values before clearing
  const data = {
    sectionId: addCategoryForSectionId.value,
    name: newCategoryName.value.trim(),
  }
  // Close modal immediately (optimistic)
  showAddCategoryModal.value = false
  newCategoryName.value = ''
  addCategoryForSectionId.value = null
  // API call in background
  try {
    await createCategory(data)
  } catch (error) {
    console.error('Failed to add category:', error)
  }
}

function openAddSubcategoryModal(parentId: number) {
  addSubcategoryParentId.value = parentId
  newSubcategoryName.value = ''
  showAddSubcategoryModal.value = true
}

async function handleAddSubcategory() {
  if (!newSubcategoryName.value.trim() || !addSubcategoryParentId.value) return
  // Find parent category to get sectionId and capture data
  let sectionId: number | null = null
  const parentId = addSubcategoryParentId.value
  const name = newSubcategoryName.value.trim()
  for (const section of sections.value) {
    if (section.categories.find(c => c.id === parentId)) {
      sectionId = section.id
      break
    }
  }
  if (!sectionId) return
  // Close modal immediately (optimistic)
  showAddSubcategoryModal.value = false
  newSubcategoryName.value = ''
  addSubcategoryParentId.value = null
  // API call in background
  try {
    await createCategory({ sectionId, name, parentId })
  } catch (error) {
    console.error('Failed to add subcategory:', error)
  }
}

async function handleUpdateEntry(entryId: number, data: { amount?: number; isPaid?: boolean }) {
  await updateCategoryEntry(entryId, data)
}

function handleDeleteCategory(categoryId: number) {
  openDialog({
    title: 'Delete Category',
    message: 'Are you sure you want to delete this category? This action cannot be undone.',
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      await deleteCategory(categoryId)
    }
  })
}

async function handleRenameCategory(categoryId: number, newName: string) {
  await updateCategory(categoryId, { name: newName })
}

async function handleCheckAllChildren(categoryId: number, month: number, isPaid: boolean) {
  await checkAllChildrenForCategory(categoryId, month, isPaid)
}

async function handleCheckAllSection(sectionId: number, month: number, isPaid: boolean) {
  await checkAllCategoriesForSection(sectionId, month, isPaid)
}

function openAddIncomeSourceModal() {
  newIncomeSourceName.value = ''
  showAddIncomeSourceModal.value = true
}

async function handleAddIncomeSource() {
  if (!newIncomeSourceName.value.trim() || !currentBudget.value) return
  // Capture values before clearing
  const data = {
    yearlyBudgetId: currentBudget.value.id,
    name: newIncomeSourceName.value.trim(),
  }
  // Close modal immediately (optimistic)
  showAddIncomeSourceModal.value = false
  newIncomeSourceName.value = ''
  // API call in background
  try {
    await createIncomeSource(data)
  } catch (error) {
    console.error('Failed to add income source:', error)
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <YearlyHeader
      @open-copy-modal="showCopyModal = true"
      @open-clear-modal="showClearModal = true"
    />

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
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
            @click="fetchBudgetByYear(yearFromRoute)"
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
            No Budget for {{ yearFromRoute }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Create a new yearly budget to start tracking your finances with the 70/20/10 rule.
          </p>
          <button
            @click="handleCreateBudget"
            class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            Create {{ yearFromRoute }} Budget
          </button>
        </div>
      </div>

      <!-- Budget View -->
      <div v-else class="overflow-x-auto p-4">
        <!-- Month Headers -->
        <div class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
          <div class="flex">
            <div
              class="relative px-3 py-2 border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
              :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
            >
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Category</span>
              <!-- Resize Handle -->
              <div
                class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                @mousedown="startResize"
                title="Drag to resize"
              ></div>
            </div>
            <div class="flex flex-1 overflow-hidden">
              <div
                v-for="(month, index) in MONTH_NAMES_SHORT"
                :key="index"
                class="flex-1 min-w-[100px] px-1 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0 overflow-hidden"
              >
                {{ month }}
              </div>
            </div>
          </div>
        </div>

        <!-- Sections -->
        <div class="space-y-4">
          <!-- Income Section -->
          <YearlyIncomeSection @add-source="openAddIncomeSourceModal" />

          <!-- Budget Sections (70/20/10) -->
          <YearlyBudgetSection
            v-for="section in sections"
            :key="section.id"
            :section="section"
            :show-warnings="currentBudget?.showWarnings"
            @add-category="openAddCategoryModal"
            @update-entry="handleUpdateEntry"
            @delete-category="handleDeleteCategory"
            @add-subcategory="openAddSubcategoryModal"
            @rename-category="handleRenameCategory"
            @check-all-children="handleCheckAllChildren"
            @check-all-section="handleCheckAllSection"
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

    <!-- Clear Month Modal -->
    <YearlyClearMonthModal
      :is-open="showClearModal"
      @close="showClearModal = false"
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

    <!-- Add Income Source Modal -->
    <Teleport to="body">
      <div
        v-if="showAddIncomeSourceModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showAddIncomeSourceModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Income Source</h3>
          <input
            v-model="newIncomeSourceName"
            type="text"
            placeholder="e.g., Salary, Side Hustle, Investments"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
            @keydown.enter="handleAddIncomeSource"
          />
          <div class="flex justify-end gap-2">
            <button
              @click="showAddIncomeSourceModal = false"
              class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              @click="handleAddIncomeSource"
              class="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Subcategory Modal -->
    <Teleport to="body">
      <div
        v-if="showAddSubcategoryModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showAddSubcategoryModal = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Subcategory</h3>
          <input
            v-model="newSubcategoryName"
            type="text"
            placeholder="Subcategory name"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            @keydown.enter="handleAddSubcategory"
          />
          <div class="flex justify-end gap-2">
            <button
              @click="showAddSubcategoryModal = false"
              class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              @click="handleAddSubcategory"
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
