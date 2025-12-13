<script setup lang="ts">
import type { YearlyCategoryWithChildren, YearlyCategoryEntry } from '~/types/yearly'
import { MONTH_NAMES_SHORT } from '~/types/yearly'
import { useColumnWidth } from '~/composables/useColumnResize'
import { formatCurrency } from '~/utils/currency'

const props = defineProps<{
  category: YearlyCategoryWithChildren
  isChild?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-entry', entryId: number, data: { amount?: number; isPaid?: boolean }): void
  (e: 'delete', categoryId: number): void
  (e: 'add-child', parentId: number): void
  (e: 'rename', categoryId: number, newName: string): void
  (e: 'check-all-children', categoryId: number, month: number, isPaid: boolean): void
}>()

const { openDialog } = useConfirmDialog()

const { columnWidth } = useColumnWidth()

const isExpanded = ref(true)
const isEditing = ref(false)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

const hasChildren = computed(() => props.category.children && props.category.children.length > 0)

function getEntryForMonth(month: number): YearlyCategoryEntry | undefined {
  return props.category.entries.find(e => e.month === month)
}

// Check if all children are paid for a given month
function areAllChildrenPaidForMonth(month: number): boolean {
  if (!hasChildren.value) return false
  return props.category.children!.every(child => {
    const entry = child.entries.find(e => e.month === month)
    return entry?.isPaid ?? false
  })
}

// Get the total amount for parent (sum of children) for a month
function getParentTotalForMonth(month: number): number {
  if (!hasChildren.value) return 0
  return props.category.children!.reduce((sum, child) => {
    const entry = child.entries.find(e => e.month === month)
    return sum + (entry?.amount ?? 0)
  }, 0)
}

// Handle parent checkbox click - show dialog and check all children
function handleParentCheckboxClick(month: number) {
  const allChecked = areAllChildrenPaidForMonth(month)

  if (allChecked) {
    // Uncheck all children directly
    openDialog({
      title: 'Uncheck All Subcategories',
      message: `Do you want to uncheck all subcategories in "${props.category.name}" for this month?`,
      confirmText: 'Uncheck All',
      confirmColor: 'blue',
      onConfirm: () => {
        emit('check-all-children', props.category.id, month, false)
      }
    })
  } else {
    // Ask to check all children
    openDialog({
      title: 'Check All Subcategories',
      message: `Do you want to mark all subcategories in "${props.category.name}" as paid for this month?`,
      confirmText: 'Check All',
      confirmColor: 'green',
      onConfirm: () => {
        emit('check-all-children', props.category.id, month, true)
      }
    })
  }
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

function startEditing() {
  editName.value = props.category.name
  isEditing.value = true
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function cancelEditing() {
  isEditing.value = false
  editName.value = ''
}

function saveEdit() {
  const trimmedName = editName.value.trim()
  if (trimmedName && trimmedName !== props.category.name) {
    emit('rename', props.category.id, trimmedName)
  }
  isEditing.value = false
  editName.value = ''
}

function handleEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    saveEdit()
  } else if (event.key === 'Escape') {
    cancelEditing()
  }
}
</script>

<template>
  <div>
    <!-- Category Row -->
    <div
      class="group flex items-stretch border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      :class="{ 'bg-gray-50/50 dark:bg-gray-800/30': isChild }"
    >
      <!-- Category Name (sticky) -->
      <div
        class="sticky left-0 z-10 relative flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
        :class="{ 'pl-6': isChild }"
        :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
      >
        <!-- Expand/Collapse -->
        <button
          v-if="hasChildren"
          @click="toggleExpand"
          class="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform text-gray-500 dark:text-gray-300"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span v-else class="w-5 flex-shrink-0"></span>

        <!-- Edit Mode -->
        <input
          v-if="isEditing"
          ref="editInputRef"
          v-model="editName"
          type="text"
          class="flex-1 min-w-0 text-sm px-1 py-0.5 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          @keydown="handleEditKeydown"
          @blur="saveEdit"
        />

        <!-- Display Mode -->
        <span
          v-else
          class="text-sm font-medium truncate flex-1 min-w-0 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded"
          @click="startEditing"
        >{{ category.name }}</span>

        <!-- Actions (absolute positioned) - hidden when editing -->
        <div
          v-if="!isEditing"
          class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white dark:bg-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            v-if="!isChild"
            @click.stop="emit('add-child', category.id)"
            class="p-1 text-gray-400 hover:text-blue-500"
            title="Add subcategory"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
          </button>
          <button
            @click.stop="emit('delete', category.id)"
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
          :class="{
            'bg-green-50 dark:bg-green-900/20': hasChildren && areAllChildrenPaidForMonth(month),
          }"
        >
          <!-- Parent category with children - show aggregate checkbox -->
          <div
            v-if="hasChildren"
            class="relative flex items-center gap-1 px-1 py-0.5 min-w-[100px] h-full"
          >
            <button
              @click="handleParentCheckboxClick(month)"
              class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
            >
              <span
                class="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                :class="areAllChildrenPaidForMonth(month)
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400'"
              >
                <svg v-if="areAllChildrenPaidForMonth(month)" xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </button>
            <span
              class="flex-1 text-right text-sm text-gray-900 dark:text-gray-100"
            >
              {{ formatCurrency(getParentTotalForMonth(month)) }}
            </span>
          </div>
          <!-- Leaf category - use regular MonthCell -->
          <YearlyMonthCell
            v-else
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
        @rename="(categoryId, newName) => emit('rename', categoryId, newName)"
        @check-all-children="(categoryId, month, isPaid) => emit('check-all-children', categoryId, month, isPaid)"
      />
    </template>
  </div>
</template>
