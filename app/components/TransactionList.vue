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
          placeholder="e.g., Woolworths, Pick n Pay"
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          required
          :disabled="isAdding"
          @keydown.enter.prevent="handleAdd"
          @keydown.escape.prevent="cancelAdd"
        />
        <CurrencyInput
          v-model="newTransaction.amount"
          placeholder="e.g., 250.00"
          class="w-28 text-sm"
          required
          :disabled="isAdding"
          @enter="handleAdd"
          @escape="cancelAdd"
        />
      </div>
      <div class="mb-2">
        <DatePicker
          v-model="newTransaction.date"
          placeholder="Select date"
          class="text-sm"
          required
          :disabled="isAdding"
        />
      </div>
      <div class="flex justify-end space-x-2 mt-2">
        <button
          type="button"
          @click="cancelAdd"
          :disabled="isAdding"
          class="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isAdding"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          <svg v-if="isAdding" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isAdding ? 'Adding...' : 'Add' }}</span>
        </button>
      </div>
    </form>

    <!-- Transactions List -->
    <div v-if="transactions.length === 0 && !showAddForm" class="text-center py-6">
      <svg class="w-10 h-10 mx-auto text-gray-400 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-gray-500 dark:text-gray-400 text-xs">No transactions yet</p>
      <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">Click "Add Transaction" to record your first expense</p>
    </div>

    <ul v-else class="space-y-2 mt-3">
      <li
        v-for="transaction in sortedTransactions"
        :key="transaction.id"
        :class="[
          'flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded transition-opacity',
          { 'animate-pulse opacity-70': isTempId(transaction.id) }
        ]"
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
                :disabled="isTempId(transaction.id)"
                class="p-1"
                :class="isTempId(transaction.id) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:text-blue-700'"
                title="Edit"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="handleDelete(transaction.id)"
                :disabled="isTempId(transaction.id)"
                class="p-1"
                :class="isTempId(transaction.id) ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 dark:text-red-400 hover:text-red-700'"
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
        <form
          v-else
          :ref="el => setEditFormRef(transaction.id, el as HTMLFormElement | null)"
          @submit.prevent="handleUpdate(transaction.id)"
          @focusout="(e) => handleEditFormFocusOut(transaction.id, e)"
          class="flex-1 space-y-2"
        >
          <div class="flex items-center space-x-2">
            <input
              v-model="editedTransaction.description"
              type="text"
              placeholder="e.g., Woolworths, Pick n Pay"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              required
              :disabled="isUpdating"
              @keydown.enter.prevent="handleUpdate(transaction.id)"
              @keydown.escape.prevent="cancelEditing"
            />
            <CurrencyInput
              v-model="editedTransaction.amount"
              placeholder=""
              class="w-24 text-xs"
              required
              :disabled="isUpdating"
              @enter="handleUpdate(transaction.id)"
              @escape="cancelEditing"
            />
            <button
              type="submit"
              :disabled="isUpdating"
              class="text-green-600 dark:text-green-400 hover:text-green-700 p-1 disabled:opacity-50"
              title="Save"
            >
              <svg v-if="isUpdating" class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              type="button"
              @click="cancelEditing"
              :disabled="isUpdating"
              class="text-gray-600 dark:text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50"
              title="Cancel"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <DatePicker
            v-model="editedTransaction.date"
            placeholder="Select date"
            class="text-xs"
            required
            :disabled="isUpdating"
          />
        </form>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Transaction } from '~/types/budget'
import { formatCurrency, centsToRands } from '~/utils/currency'
import { formatDate, getCurrentTimestamp, parseDate } from '~/utils/date'
import { isTempId } from '~/composables/useOptimisticUpdates'

interface Props {
  categoryId: number
  transactions: readonly Transaction[]
}

const props = defineProps<Props>()

const { createTransaction, updateTransaction, deleteTransaction } = useBudget()
const { openDialog } = useConfirmDialog()

const showAddForm = ref(false)
const editingId = ref<number | null>(null)
const isAdding = ref(false)
const isUpdating = ref(false)
const editFormRefs = new Map<number, HTMLFormElement | null>()

const setEditFormRef = (id: number, el: HTMLFormElement | null) => {
  if (el) {
    editFormRefs.set(id, el)
  } else {
    editFormRefs.delete(id)
  }
}

const newTransaction = ref({
  description: '',
  amount: 0,
  date: formatDate(getCurrentTimestamp(), 'iso'),
})

const editedTransaction = ref({
  description: '',
  amount: 0,
  date: '',
})

const sortedTransactions = computed(() => {
  return [...props.transactions].sort((a, b) => {
    // Sort by transactionDate descending, then by createdAt descending
    const dateA = a.transactionDate || 0
    const dateB = b.transactionDate || 0
    if (dateB !== dateA) {
      return dateB - dateA
    }
    // Same transactionDate, sort by createdAt (newest first)
    return b.createdAt - a.createdAt
  })
})

const handleAdd = async () => {
  if (isAdding.value) return // Prevent double submission
  isAdding.value = true

  // Capture values before clearing form
  const data = {
    categoryId: props.categoryId,
    description: newTransaction.value.description,
    amount: newTransaction.value.amount,
    transactionDate: parseDate(newTransaction.value.date) ?? getCurrentTimestamp(),
  }
  // Close form immediately (optimistic)
  cancelAdd()
  try {
    await createTransaction(data)
  } catch (error) {
    console.error('Failed to add transaction:', error)
  } finally {
    isAdding.value = false
  }
}

const cancelAdd = () => {
  showAddForm.value = false
  newTransaction.value = {
    description: '',
    amount: 0,
    date: formatDate(getCurrentTimestamp(), 'iso'),
  }
}

const startEditing = (transaction: Transaction) => {
  editingId.value = transaction.id
  editedTransaction.value = {
    description: transaction.description || '',
    amount: centsToRands(transaction.amount),
    date: transaction.transactionDate
      ? formatDate(transaction.transactionDate, 'iso')
      : formatDate(getCurrentTimestamp(), 'iso'),
  }
}

const cancelEditing = () => {
  editingId.value = null
  editedTransaction.value = { description: '', amount: 0, date: '' }
}

const handleEditFormFocusOut = (transactionId: number, event: FocusEvent) => {
  // Don't cancel if focus is moving to another element within the form
  const relatedTarget = event.relatedTarget as HTMLElement | null
  const formRef = editFormRefs.get(transactionId)
  if (formRef && relatedTarget && formRef.contains(relatedTarget)) {
    return
  }
  // Don't cancel if focus is moving to a popover/modal (date picker)
  // Check for HeadlessUI popover, v-calendar, or NuxtUI popover panel
  if (relatedTarget?.closest('[data-headlessui-state]') ||
      relatedTarget?.closest('.vc-container') ||
      relatedTarget?.closest('[data-headlessui-portal]')) {
    return
  }
  // Check if any popover is currently open in the document
  const openPopover = document.querySelector('[data-headlessui-state="open"]')
  if (openPopover) {
    return
  }
  // Longer delay to allow date picker to update the model and close popover
  setTimeout(() => {
    // Only cancel if we're still in edit mode and focus truly left
    if (editingId.value === transactionId) {
      const activeElement = document.activeElement
      const formRefCurrent = editFormRefs.get(transactionId)
      // Check if there's still an open popover
      const stillOpenPopover = document.querySelector('[data-headlessui-state="open"]')
      if (stillOpenPopover) {
        return
      }
      // Check if focus is still within form or in a popover
      if (formRefCurrent && !formRefCurrent.contains(activeElement) &&
          !activeElement?.closest('[data-headlessui-state]') &&
          !activeElement?.closest('.vc-container') &&
          !activeElement?.closest('[data-headlessui-portal]')) {
        cancelEditing()
      }
    }
  }, 250)
}

const handleUpdate = async (id: number) => {
  if (isUpdating.value) return // Prevent double submission
  isUpdating.value = true

  // Capture values before clearing form
  const data = {
    description: editedTransaction.value.description,
    amount: editedTransaction.value.amount,
    transactionDate: parseDate(editedTransaction.value.date) ?? getCurrentTimestamp(),
  }
  // Close edit mode immediately (optimistic)
  cancelEditing()
  try {
    await updateTransaction(id, data)
  } catch (error) {
    console.error('Failed to update transaction:', error)
  } finally {
    isUpdating.value = false
  }
}

const handleDelete = async (id: number) => {
  openDialog({
    title: 'Delete Transaction',
    message: 'Are you sure you want to delete this transaction?',
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      try {
        await deleteTransaction(id)
      } catch (error) {
        console.error('Failed to delete transaction:', error)
      }
    },
  })
}
</script>
