<template>
  <div
    class="rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-opacity"
    :class="[
      remaining >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20',
      { 'animate-pulse opacity-70': isTempId(category.id) }
    ]"
  >
    <!-- Category Header - Collapsible -->
    <div
      class="p-4 cursor-pointer hover:opacity-90 transition-opacity"
      @click="toggleExpanded"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2 flex-1">
          <!-- Chevron Icon -->
          <svg
            class="w-5 h-5 transition-transform"
            :class="{ 'transform rotate-90': isExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>

          <template v-if="editingCategory">
            <form
              ref="editFormRef"
              @submit.prevent="handleUpdateCategory"
              @click.stop
              @focusout="handleEditFormFocusOut"
              class="flex-1 flex items-center space-x-2"
            >
              <input
                v-model="editedCategory.name"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
                @keydown.enter.prevent="handleUpdateCategory"
                @keydown.escape.prevent="cancelEditCategory"
              />
              <CurrencyInput
                v-model="editedCategory.allocatedAmount"
                placeholder="e.g., 5000.00"
                class="w-28 text-sm"
                required
                @enter="handleUpdateCategory"
                @escape="cancelEditCategory"
              />
              <button
                type="submit"
                class="text-green-600 dark:text-green-400 hover:text-green-700 p-1"
                title="Save"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                type="button"
                @click="cancelEditCategory"
                class="text-gray-600 dark:text-gray-400 hover:text-gray-700 p-1"
                title="Cancel"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          </template>
          <template v-else>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ category.name }}
            </h3>
          </template>
        </div>

        <div class="flex items-center space-x-2" @click.stop>
          <button
            v-if="!editingCategory"
            @click="startEditCategory"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1"
            title="Edit category"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            v-if="!editingCategory"
            @click="handleDeleteCategory"
            class="text-red-600 dark:text-red-400 hover:text-red-700 p-1"
            title="Delete category"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Summary - Always Visible -->
      <div class="mt-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
        <span>Budget: {{ formatCurrency(budgeted) }}</span>
        <span>Spent: {{ formatCurrency(spent) }}</span>
      </div>
    </div>

    <!-- Expandable Content -->
    <div v-if="isExpanded" class="p-4 pt-0">
      <!-- Budget Progress -->
      <div class="mb-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="text-gray-600 dark:text-gray-400">
            {{ formatCurrency(spent) }} of {{ formatCurrency(budgeted) }}
          </span>
          <span :class="remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'" class="font-medium">
            {{ remaining >= 0 ? formatCurrency(remaining) : formatCurrency(Math.abs(remaining)) }} {{ remaining >= 0 ? 'left' : 'over' }}
          </span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            :class="[
              'h-2 rounded-full transition-all',
              remaining >= 0 ? 'bg-green-500' : 'bg-red-500'
            ]"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Transactions -->
      <TransactionList
        :category-id="category.id"
        :transactions="category.transactions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BudgetCategoryWithTransactions } from '~/types/budget'
import { formatCurrency, centsToRands } from '~/utils/currency'
import { isTempId } from '~/composables/useOptimisticUpdates'

interface Props {
  category: BudgetCategoryWithTransactions
}

const props = defineProps<Props>()

const { updateCategory, deleteCategory } = useBudget()
const { openDialog } = useConfirmDialog()

const isExpanded = ref(false) // Start collapsed by default
const editingCategory = ref(false)
const editFormRef = ref<HTMLFormElement | null>(null)
const editedCategory = ref({
  name: '',
  allocatedAmount: 0,
})

const toggleExpanded = () => {
  if (!editingCategory.value) {
    isExpanded.value = !isExpanded.value
  }
}

const budgeted = computed(() => centsToRands(props.category.allocatedAmount))

const spent = computed(() => {
  const total = props.category.transactions.reduce((sum, txn) => sum + txn.amount, 0)
  return centsToRands(total)
})

const remaining = computed(() => budgeted.value - spent.value)

const progressPercentage = computed(() => {
  if (budgeted.value === 0) return 0
  const percentage = (spent.value / budgeted.value) * 100
  return Math.min(percentage, 100)
})

const startEditCategory = () => {
  editingCategory.value = true
  editedCategory.value = {
    name: props.category.name,
    allocatedAmount: centsToRands(props.category.allocatedAmount),
  }
}

const cancelEditCategory = () => {
  editingCategory.value = false
  editedCategory.value = { name: '', allocatedAmount: 0 }
}

const handleEditFormFocusOut = (event: FocusEvent) => {
  // Don't cancel if focus is moving to another element within the form
  const relatedTarget = event.relatedTarget as HTMLElement | null
  if (editFormRef.value && relatedTarget && editFormRef.value.contains(relatedTarget)) {
    return
  }
  // Focus left the form, cancel editing
  cancelEditCategory()
}

const handleUpdateCategory = async () => {
  // Capture values before clearing form
  const data = {
    name: editedCategory.value.name,
    allocatedAmount: editedCategory.value.allocatedAmount,
  }
  const categoryId = props.category.id
  // Close edit mode immediately (optimistic)
  cancelEditCategory()
  try {
    await updateCategory(categoryId, data)
  } catch (error) {
    console.error('Failed to update category:', error)
  }
}

const handleDeleteCategory = async () => {
  openDialog({
    title: 'Delete Budget Category',
    message: `Are you sure you want to delete "${props.category.name}" and all its transactions?`,
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      try {
        await deleteCategory(props.category.id)
      } catch (error) {
        console.error('Failed to delete category:', error)
      }
    },
  })
}
</script>
