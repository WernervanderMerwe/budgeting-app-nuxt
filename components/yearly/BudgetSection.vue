<script setup lang="ts">
import type { YearlySectionWithCategories } from '~/types/yearly'
import { MONTH_NAMES_SHORT } from '~/types/yearly'
import { formatCurrency, centsToRands } from '~/utils/currency'
import { useColumnWidth } from '~/composables/useColumnResize'

const props = defineProps<{
  section: YearlySectionWithCategories
  showWarnings?: boolean
}>()

const emit = defineEmits<{
  (e: 'add-category', sectionId: number): void
  (e: 'update-entry', entryId: number, data: { amount?: number; isPaid?: boolean }): void
  (e: 'delete-category', categoryId: number): void
  (e: 'add-subcategory', parentId: number): void
  (e: 'rename-category', categoryId: number, newName: string): void
  (e: 'check-all-children', categoryId: number, month: number, isPaid: boolean): void
  (e: 'check-all-section', sectionId: number, month: number, isPaid: boolean): void
}>()

const { getSectionTotalForMonth } = useYearlyCategories()
const { getSectionPercentage, isSectionOverBudget } = useYearlySummary()
const { currentBudget } = useYearlyBudget()
const { columnWidth } = useColumnWidth()
const { openDialog } = useConfirmDialog()

const isExpanded = ref(true)

// Filter to only show parent categories
const parentCategories = computed(() => {
  return props.section.categories.filter(c => !c.parentId)
})

function getWarningClass(month: number): string {
  if (!props.showWarnings) return ''
  const isOver = isSectionOverBudget(props.section.id, month)
  return isOver ? 'text-red-500 font-semibold' : 'text-green-600'
}

// Check if all categories in section are paid for a given month
function areAllCategoriesPaidForMonth(month: number): boolean {
  // Return false if no categories exist (empty array .every() returns true)
  if (props.section.categories.length === 0) return false

  // Get IDs of categories that have children (parent categories)
  const parentIdsWithChildren = new Set(
    props.section.categories
      .map(c => c.parentId)
      .filter((id): id is number => id !== null)
  )

  // Only check leaf categories (those without children)
  // Parent categories don't have their own isPaid - they compute from children
  const leafCategories = props.section.categories.filter(c => !parentIdsWithChildren.has(c.id))

  if (leafCategories.length === 0) return false

  return leafCategories.every(category => {
    const entry = category.entries.find(e => e.month === month)
    return entry?.isPaid ?? false
  })
}

// Handle section checkbox click - show dialog and check all categories
function handleSectionCheckboxClick(month: number, event: MouseEvent) {
  event.stopPropagation() // Prevent section expand/collapse
  const allChecked = areAllCategoriesPaidForMonth(month)

  if (allChecked) {
    openDialog({
      title: 'Uncheck All Categories',
      message: `Do you want to uncheck all categories in "${props.section.name}" for this month?`,
      confirmText: 'Uncheck All',
      confirmColor: 'blue',
      onConfirm: () => {
        emit('check-all-section', props.section.id, month, false)
      }
    })
  } else {
    openDialog({
      title: 'Check All Categories',
      message: `Do you want to mark all categories in "${props.section.name}" as paid for this month?`,
      confirmText: 'Check All',
      confirmColor: 'green',
      onConfirm: () => {
        emit('check-all-section', props.section.id, month, true)
      }
    })
  }
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
    <!-- Section Header -->
    <div
      class="flex items-stretch bg-gray-100 dark:bg-gray-800 cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <!-- Section Name (sticky) -->
      <div
        class="sticky left-0 z-10 flex items-center gap-2 px-2 py-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
        :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
      >
        <button class="p-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform text-gray-600 dark:text-gray-300"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span class="font-semibold text-gray-900 dark:text-white">{{ section.name }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">({{ section.targetPercent }}%)</span>
      </div>

      <!-- Month Totals with Section Checkboxes -->
      <div class="flex flex-1 overflow-hidden">
        <div
          v-for="month in 12"
          :key="month"
          class="flex-1 min-w-[115px] px-1 py-2 flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
          :class="[getWarningClass(month), { 'bg-green-100/50 dark:bg-green-900/30': areAllCategoriesPaidForMonth(month) }]"
        >
          <button
            @click="handleSectionCheckboxClick(month, $event)"
            class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
          >
            <span
              class="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
              :class="areAllCategoriesPaidForMonth(month)
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-400 dark:border-gray-500 group-hover:border-green-400'"
            >
              <svg v-if="areAllCategoriesPaidForMonth(month)" xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </span>
          </button>
          <span class="flex-1 text-right text-sm font-medium">
            {{ formatCurrency(centsToRands(getSectionTotalForMonth(section.id, month))) }}
            <span class="text-xs ml-1">({{ getSectionPercentage(section.id, month) }}%)</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <div v-show="isExpanded">
      <YearlyCategoryRow
        v-for="category in parentCategories"
        :key="category.id"
        :category="category"
        @update-entry="(entryId, data) => emit('update-entry', entryId, data)"
        @delete="emit('delete-category', $event)"
        @add-child="emit('add-subcategory', $event)"
        @rename="(categoryId, newName) => emit('rename-category', categoryId, newName)"
        @check-all-children="(categoryId, month, isPaid) => emit('check-all-children', categoryId, month, isPaid)"
      />

      <!-- Add Category Button -->
      <div class="flex border-t border-gray-200 dark:border-gray-700">
        <div
          class="sticky left-0 z-10 px-2 py-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
          :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
        >
          <button
            @click.stop="emit('add-category', section.id)"
            class="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Add Category
          </button>
        </div>
        <div class="flex-1"></div>
      </div>
    </div>
  </div>
</template>
