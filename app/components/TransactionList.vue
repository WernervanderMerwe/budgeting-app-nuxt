<template>
  <div>
    <!-- Add / Scan buttons -->
    <div v-if="!showAddForm && !showScanPanel" class="flex gap-2">
      <button
        class="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex items-center justify-center space-x-1"
        @click="showAddForm = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Transaction</span>
      </button>
      <button
        class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2 px-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex items-center justify-center space-x-1"
        title="Scan a till slip or invoice"
        @click="showScanPanel = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span>Scan</span>
      </button>
    </div>

    <!-- Scan dropzone -->
    <ReceiptScanPanel
      v-if="showScanPanel"
      ref="scanPanelRef"
      @scanned="handleScanned"
      @failed="handleScanFailed"/>
    <button
      v-if="showScanPanel"
      class="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="scanPanelRef?.isScanning"
      @click="showScanPanel = false">
      Cancel
    </button>

    <!-- Add Transaction Form -->
    <form v-if="showAddForm" class="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" @submit.prevent="handleAdd">
      <!-- Scanned slip preview: check the total against the real thing -->
      <div v-if="previewUrl" class="mb-2">
        <a :href="previewUrl" target="_blank" rel="noopener" title="Open full size">
          <img
            :src="previewUrl"
            alt="Scanned slip"
            class="max-h-40 rounded border border-gray-300 dark:border-gray-600 mx-auto">
        </a>
      </div>
      <p v-if="scanNotice" class="mb-2 text-xs text-amber-700 dark:text-amber-400">
        {{ scanNotice }}
      </p>

      <div class="flex gap-2 mb-2">
        <input
          v-model="newTransaction.description"
          type="text"
          placeholder="e.g., Woolworths, Pick n Pay"
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          required
          :disabled="isAdding"
          @keydown.enter.prevent="handleAdd"
          @keydown.escape.prevent="cancelAdd">
        <CurrencyInput
          v-model="newTransaction.amount"
          placeholder="e.g., 250.00"
          class="w-28 text-sm"
          required
          :disabled="isAdding"
          @enter="handleAdd"
          @escape="cancelAdd"/>
      </div>
      <div class="mb-2">
        <DatePicker
          v-model="newTransaction.date"
          placeholder="Select date"
          class="text-sm"
          required
          :disabled="isAdding"/>
      </div>

      <!-- Category override: only relevant after a scan -->
      <div v-if="previewUrl || wasScanned" class="mb-2">
        <select
          v-model.number="selectedCategoryId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          :disabled="isAdding">
          <option v-for="cat in monthCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        <p v-if="categoryWarning" class="mt-1 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
          <span aria-hidden="true">&#9888;</span>
          <span>{{ categoryWarning }}</span>
        </p>
      </div>
      <div class="flex justify-end space-x-2 mt-2">
        <button
          type="button"
          :disabled="isAdding"
          class="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="cancelAdd">
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isAdding"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1">
          <svg v-if="isAdding" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
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
        ]">
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
                :disabled="isTempId(transaction.id)"
                class="p-1"
                :class="isTempId(transaction.id) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:text-blue-700'"
                title="Edit"
                @click="startEditing(transaction)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                :disabled="isTempId(transaction.id)"
                class="p-1"
                :class="isTempId(transaction.id) ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 dark:text-red-400 hover:text-red-700'"
                title="Delete"
                @click="handleDelete(transaction.id)">
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
          class="flex-1 space-y-2"
          @submit.prevent="handleUpdate(transaction.id)"
          @focusout="(e) => handleEditFormFocusOut(transaction.id, e)">
          <div class="flex items-center space-x-2">
            <input
              v-model="editedTransaction.description"
              type="text"
              placeholder="e.g., Woolworths, Pick n Pay"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              required
              :disabled="isUpdating"
              @keydown.enter.prevent="handleUpdate(transaction.id)"
              @keydown.escape.prevent="cancelEditing">
            <CurrencyInput
              v-model="editedTransaction.amount"
              placeholder=""
              class="w-24 text-xs"
              required
              :disabled="isUpdating"
              @enter="handleUpdate(transaction.id)"
              @escape="cancelEditing"/>
            <button
              type="submit"
              :disabled="isUpdating"
              class="text-green-600 dark:text-green-400 hover:text-green-700 p-1 disabled:opacity-50"
              title="Save">
              <svg v-if="isUpdating" class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              type="button"
              :disabled="isUpdating"
              class="text-gray-600 dark:text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50"
              title="Cancel"
              @click="cancelEditing">
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
            :disabled="isUpdating"/>
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
import { isCategoryMismatch } from '~~/shared/utils/receipt-merchants'
import type { ScanPayload } from '~/components/ReceiptScanPanel.vue'

interface Props {
  categoryId: number
  transactions: readonly Transaction[]
}

const props = defineProps<Props>()

const { createTransaction, updateTransaction, deleteTransaction } = useBudget()
const { openDialog } = useConfirmDialog()

const showAddForm = ref(false)
const showScanPanel = ref(false)
/** Only what the panel exposes via `defineExpose` — used to disable Cancel while a scan runs. */
const scanPanelRef = ref<{ isScanning: boolean } | null>(null)
const previewUrl = ref<string | null>(null)
const scanNotice = ref<string | null>(null)
const wasScanned = ref(false)
const scannedKind = ref<string | null>(null)
const selectedCategoryId = ref<number>(props.categoryId)
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

const { currentMonth } = useMonths()

/** Categories in the current month, for reassigning a scanned slip. */
const monthCategories = computed(() => currentMonth.value?.categories ?? [])

const selectedCategoryName = computed(() =>
  monthCategories.value.find(c => c.id === selectedCategoryId.value)?.name ?? '',
)

/**
 * Only warns when the merchant kind AND the category name are both known and
 * disagree — an unrecognised shop or an unclassifiable category stays silent.
 */
const categoryWarning = computed(() => {
  if (!scannedKind.value || !selectedCategoryName.value) return null
  if (!isCategoryMismatch(scannedKind.value as never, selectedCategoryName.value)) return null
  return `This looks like a ${scannedKind.value.replace('-', ' ')} slip.`
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

function releasePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

function handleScanned({ parsed, previewUrl: url }: ScanPayload) {
  releasePreview()
  previewUrl.value = url
  wasScanned.value = true
  scannedKind.value = parsed.merchantKind
  selectedCategoryId.value = props.categoryId

  newTransaction.value = {
    description: parsed.merchant ?? '',
    // A partial scan still saves typing: leave what we could not read blank
    // rather than guessing a number.
    amount: parsed.amountCents !== null ? centsToRands(parsed.amountCents) : 0,
    date: parsed.transactionDate
      ? formatDate(parsed.transactionDate, 'iso')
      : formatDate(getCurrentTimestamp(), 'iso'),
  }

  const missing: string[] = []
  if (!parsed.merchant) missing.push('shop name')
  if (parsed.amountCents === null) missing.push('total')
  scanNotice.value = missing.length
    ? `Could not read the ${missing.join(' or ')} — please fill it in.`
    : parsed.confidence < 0.9
      ? 'Low confidence on the total — double-check it against the slip.'
      : null

  showScanPanel.value = false
  showAddForm.value = true
}

/** A failed scan must never dead-end: open a blank form so it can be typed in. */
function handleScanFailed(message: string) {
  releasePreview()
  wasScanned.value = true
  scannedKind.value = null
  selectedCategoryId.value = props.categoryId
  scanNotice.value = message
  showScanPanel.value = false
  showAddForm.value = true
}

const handleAdd = async () => {
  if (isAdding.value) return // Prevent double submission
  isAdding.value = true

  // Capture values before clearing form
  const data = {
    categoryId: selectedCategoryId.value,
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
  releasePreview()
  wasScanned.value = false
  scannedKind.value = null
  scanNotice.value = null
  selectedCategoryId.value = props.categoryId
  newTransaction.value = {
    description: '',
    amount: 0,
    date: formatDate(getCurrentTimestamp(), 'iso'),
  }
}

// The object URL would otherwise leak if the card is collapsed mid-scan.
onUnmounted(releasePreview)

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
