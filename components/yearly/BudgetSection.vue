<script setup lang="ts">
import type { YearlySectionWithCategories } from '~/types/yearly'
import { MONTH_NAMES_SHORT } from '~/types/yearly'
import { formatCurrency } from '~/utils/currency'

const props = defineProps<{
  section: YearlySectionWithCategories
  showWarnings?: boolean
}>()

const emit = defineEmits<{
  (e: 'add-category', sectionId: number): void
  (e: 'update-entry', entryId: number, data: { amount?: number; isPaid?: boolean }): void
  (e: 'delete-category', categoryId: number): void
  (e: 'add-subcategory', parentId: number): void
}>()

const { getSectionTotalForMonth } = useYearlyCategories()
const { getSectionPercentage, isSectionOverBudget } = useYearlySummary()
const { currentBudget } = useYearlyBudget()

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
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
    <!-- Section Header -->
    <div
      class="flex items-stretch bg-gray-100 dark:bg-gray-800 cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <!-- Section Name (sticky) -->
      <div class="sticky left-0 z-10 flex items-center gap-2 min-w-[200px] w-[200px] px-3 py-3 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <button class="p-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span class="font-semibold">{{ section.name }}</span>
        <span class="text-sm text-gray-500">({{ section.targetPercent }}%)</span>
      </div>

      <!-- Month Totals -->
      <div class="flex flex-1">
        <div
          v-for="month in 12"
          :key="month"
          class="flex-1 min-w-[100px] px-2 py-3 text-right text-sm font-medium border-r border-gray-200 dark:border-gray-700 last:border-r-0"
          :class="getWarningClass(month)"
        >
          {{ formatCurrency(getSectionTotalForMonth(section.id, month)) }}
          <span class="text-xs ml-1">({{ getSectionPercentage(section.id, month) }}%)</span>
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
      />

      <!-- Add Category Button -->
      <div class="flex border-t border-gray-200 dark:border-gray-700">
        <div class="sticky left-0 z-10 min-w-[200px] w-[200px] px-3 py-2 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
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
