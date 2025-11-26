<template>
  <div>
    <!-- Add Transaction Button -->
    <button
      v-if="!showAddForm"
      @click="showAddForm = true"
      class="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex items-center justify-center space-x-1"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      <span>Add Transaction</span>
    </button>

    <!-- Add Transaction Form -->
    <form v-if="showAddForm" @submit.prevent="handleAdd" class="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div class="flex gap-2 mb-2">
        <input
          v-model="newTransaction.description"
          type="text"
          placeholder="Description"
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <input
          v-model.number="newTransaction.amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount (R)"
          class="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div class="flex justify-end space-x-2 mt-2">
        <button
          type="button"
          @click="cancelAdd"
          class="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Add
        </button>
      </div>
    </form>

    <!-- Transactions List -->
    <div v-if="transactions.length === 0 && !showAddForm" class="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
      No transactions yet
    </div>

    <ul v-else class="space-y-2 mt-3">
      <li
        v-for="transaction in sortedTransactions"
        :key="transaction.id"
        class="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
      >
        <!-- Display Mode -->
        <template v-if="editingId !== transaction.id">
          <div class="flex-1 min-w-0">
            <p class="text-gray-900 dark:text-white truncate">
              {{ transaction.description || 'No description' }}
            </p>
            <p v-if="transaction.transactionDate" class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatDate(transaction.transactionDate, 'short') }}
            </p>
          </div>
          <div class="flex items-center space-x-2 ml-3">
            <span class="font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(centsToRands(transaction.amount)) }}
            </span>
            <div class="flex space-x-1">
              <button
                @click="startEditing(transaction)"
                class="text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1"
                title="Edit"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="handleDelete(transaction.id)"
                class="text-red-600 dark:text-red-400 hover:text-red-700 p-1"
                title="Delete"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Edit Mode -->
        <form v-else @submit.prevent="handleUpdate(transaction.id)" class="flex-1 flex items-center space-x-2">
          <input
            v-model="editedTransaction.description"
            type="text"
            placeholder="Description"
            class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
            required
          />
          <input
            v-model.number="editedTransaction.amount"
            type="number"
            min="0"
            step="0.01"
            class="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
            required
          />
          <button
            type="submit"
            class="text-green-600 dark:text-green-400 hover:text-green-700 p-1"
            title="Save"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            @click="cancelEditing"
            class="text-gray-600 dark:text-gray-400 hover:text-gray-700 p-1"
            title="Cancel"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Transaction } from '~/types/budget'
import { formatCurrency, centsToRands } from '~/utils/currency'
import { formatDate, getCurrentTimestamp } from '~/utils/date'

interface Props {
  categoryId: number
  transactions: readonly Transaction[]
}

const props = defineProps<Props>()

const { createTransaction, updateTransaction, deleteTransaction } = useBudget()

const showAddForm = ref(false)
const editingId = ref<number | null>(null)

const newTransaction = ref({
  description: '',
  amount: 0,
})

const editedTransaction = ref({
  description: '',
  amount: 0,
})

const sortedTransactions = computed(() => {
  return [...props.transactions].sort((a, b) => {
    // Sort by transactionDate descending (most recent first)
    if (a.transactionDate && b.transactionDate) {
      return b.transactionDate - a.transactionDate
    }
    // If no date, sort by createdAt descending
    return b.createdAt - a.createdAt
  })
})

const handleAdd = async () => {
  try {
    await createTransaction({
      categoryId: props.categoryId,
      description: newTransaction.value.description,
      amount: newTransaction.value.amount,
      transactionDate: getCurrentTimestamp(),
    })
    cancelAdd()
  } catch (error) {
    console.error('Failed to add transaction:', error)
  }
}

const cancelAdd = () => {
  showAddForm.value = false
  newTransaction.value = { description: '', amount: 0 }
}

const startEditing = (transaction: Transaction) => {
  editingId.value = transaction.id
  editedTransaction.value = {
    description: transaction.description || '',
    amount: centsToRands(transaction.amount),
  }
}

const cancelEditing = () => {
  editingId.value = null
  editedTransaction.value = { description: '', amount: 0 }
}

const handleUpdate = async (id: number) => {
  try {
    await updateTransaction(id, {
      description: editedTransaction.value.description,
      amount: editedTransaction.value.amount,
    })
    cancelEditing()
  } catch (error) {
    console.error('Failed to update transaction:', error)
  }
}

const handleDelete = async (id: number) => {
  if (confirm('Are you sure you want to delete this transaction?')) {
    try {
      await deleteTransaction(id)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }
}
</script>
