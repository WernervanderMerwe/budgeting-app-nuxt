<script setup lang="ts">
import type { YearlyCategoryWithChildren, YearlyCategoryEntry } from '~/types/yearly'
import { MONTH_NAMES_SHORT } from '~/types/yearly'

const props = defineProps<{
  category: YearlyCategoryWithChildren
  isChild?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-entry', entryId: number, data: { amount?: number; isPaid?: boolean }): void
  (e: 'delete', categoryId: number): void
  (e: 'add-child', parentId: number): void
}>()

const isExpanded = ref(true)
const isEditing = ref(false)
const editName = ref('')

const hasChildren = computed(() => props.category.children && props.category.children.length > 0)

function getEntryForMonth(month: number): YearlyCategoryEntry | undefined {
  return props.category.entries.find(e => e.month === month)
}

function handleAmountUpdate(month: number, amount: number) {
  const entry = getEntryForMonth(month)
  if (entry) {
    emit('update-entry', entry.id, { amount })
  }
}

function handlePaidUpdate(month: number, isPaid: boolean) {
  const entry = getEntryForMonth(month)
  if (entry) {
    emit('update-entry', entry.id, { isPaid })
  }
}

function toggleExpand() {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <div>
    <!-- Category Row -->
    <div
      class="flex items-stretch border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      :class="{ 'bg-gray-50/50 dark:bg-gray-800/30': isChild }"
    >
      <!-- Category Name (sticky) -->
      <div
        class="sticky left-0 z-10 flex items-center gap-2 min-w-[200px] w-[200px] px-3 py-2 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
        :class="{ 'pl-8': isChild }"
      >
        <!-- Expand/Collapse -->
        <button
          v-if="hasChildren"
          @click="toggleExpand"
          class="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span v-else class="w-5"></span>

        <span class="text-sm font-medium truncate flex-1">{{ category.name }}</span>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            v-if="!isChild"
            @click="emit('add-child', category.id)"
            class="p-1 text-gray-400 hover:text-blue-500"
            title="Add subcategory"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
          </button>
          <button
            @click="emit('delete', category.id)"
            class="p-1 text-gray-400 hover:text-red-500"
            title="Delete category"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Month Cells -->
      <div class="flex flex-1">
        <div
          v-for="month in 12"
          :key="month"
          class="flex-1 min-w-[100px] border-r border-gray-100 dark:border-gray-800 last:border-r-0"
        >
          <YearlyMonthCell
            :amount="getEntryForMonth(month)?.amount ?? 0"
            :is-paid="getEntryForMonth(month)?.isPaid ?? false"
            :show-checkbox="true"
            :editable="true"
            @update:amount="handleAmountUpdate(month, $event)"
            @update:is-paid="handlePaidUpdate(month, $event)"
          />
        </div>
      </div>
    </div>

    <!-- Children -->
    <template v-if="hasChildren && isExpanded">
      <YearlyCategoryRow
        v-for="child in category.children"
        :key="child.id"
        :category="child as YearlyCategoryWithChildren"
        :is-child="true"
        @update-entry="(entryId, data) => emit('update-entry', entryId, data)"
        @delete="emit('delete', $event)"
      />
    </template>
  </div>
</template>
