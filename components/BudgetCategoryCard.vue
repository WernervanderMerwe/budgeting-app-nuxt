<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
    <!-- Category Header -->
    <div class="flex items-center justify-between mb-4">
      <template v-if="editingCategory">
        <form @submit.prevent="handleUpdateCategory" class="flex-1 flex items-center space-x-2">
          <input
            v-model="editedCategory.name"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            required
          />
          <input
            v-model.number="editedCategory.allocatedAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Budget"
            class="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            required
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
        <div class="flex items-center space-x-2">
          <button
            @click="startEditCategory"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1"
            title="Edit category"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click="handleDeleteCategory"
            class="text-red-600 dark:text-red-400 hover:text-red-700 p-1"
            title="Delete category"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>
    </div>

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
</template>

<script setup lang="ts">
import type { BudgetCategoryWithTransactions } from '~/types/budget'
import { formatCurrency, centsToRands, randsToCents } from '~/utils/currency'

interface Props {
  category: BudgetCategoryWithTransactions
}

const props = defineProps<Props>()

const { updateCategory, deleteCategory } = useBudget()

const editingCategory = ref(false)
const editedCategory = ref({
  name: '',
  allocatedAmount: 0,
})

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

const handleUpdateCategory = async () => {
  try {
    await updateCategory(props.category.id, {
      name: editedCategory.value.name,
      allocatedAmount: randsToCents(editedCategory.value.allocatedAmount),
    })
    cancelEditCategory()
  } catch (error) {
    console.error('Failed to update category:', error)
  }
}

const handleDeleteCategory = async () => {
  if (confirm(`Are you sure you want to delete "${props.category.name}" and all its transactions?`)) {
    try {
      await deleteCategory(props.category.id)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }
}
</script>
