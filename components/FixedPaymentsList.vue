<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Fixed Payments
      </h2>
      <button
        @click="showAddForm = true"
        class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add</span>
      </button>
    </div>

    <!-- Add Form -->
    <form v-if="showAddForm" @submit.prevent="handleAdd" class="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div class="flex gap-3 mb-3">
        <input
          v-model="newPayment.name"
          type="text"
          placeholder="e.g., Rent, Car Payment"
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <input
          v-model.number="newPayment.amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g., 8500.00"
          class="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div class="flex justify-end space-x-2">
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

    <!-- Payments List -->
    <div v-if="fixedPayments.length === 0 && !showAddForm" class="text-center py-10">
      <svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">No fixed payments yet</p>
      <p class="text-gray-500 dark:text-gray-500 text-xs mt-1">Add recurring payments like rent or subscriptions</p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="payment in fixedPayments"
        :key="payment.id"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
      >
        <!-- Display Mode -->
        <template v-if="editingId !== payment.id">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ payment.name }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(centsToRands(payment.amount)) }}
            </span>
            <div class="flex space-x-1">
              <button
                @click="startEditing(payment)"
                class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1"
                title="Edit"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="handleDelete(payment.id)"
                class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Edit Mode -->
        <form v-else @submit.prevent="handleUpdate(payment.id)" class="flex-1 flex items-center space-x-2">
          <input
            v-model="editedPayment.name"
            type="text"
            class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            required
          />
          <input
            v-model.number="editedPayment.amount"
            type="number"
            min="0"
            step="0.01"
            class="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            required
          />
          <button
            type="submit"
            class="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1"
            title="Save"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            @click="cancelEditing"
            class="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1"
            title="Cancel"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      </li>
    </ul>

    <!-- Total -->
    <div v-if="fixedPayments.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Fixed Payments</span>
        <span class="text-lg font-bold text-gray-900 dark:text-white">
          {{ formatCurrency(totalFixedPayments) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FixedPayment } from '~/types/budget'
import { formatCurrency, centsToRands } from '~/utils/currency'

interface Props {
  monthId: number
  fixedPayments: readonly FixedPayment[]
}

const props = defineProps<Props>()

const { createFixedPayment, updateFixedPayment, deleteFixedPayment } = useBudget()
const { openDialog } = useConfirmDialog()

const showAddForm = ref(false)
const editingId = ref<number | null>(null)

const newPayment = ref({
  name: '',
  amount: 0,
})

const editedPayment = ref({
  name: '',
  amount: 0,
})

const totalFixedPayments = computed(() => {
  const total = props.fixedPayments.reduce((sum, payment) => sum + payment.amount, 0)
  return centsToRands(total)
})

const handleAdd = async () => {
  try {
    await createFixedPayment({
      monthId: props.monthId,
      name: newPayment.value.name,
      amount: newPayment.value.amount,
    })
    cancelAdd()
  } catch (error) {
    console.error('Failed to add fixed payment:', error)
  }
}

const cancelAdd = () => {
  showAddForm.value = false
  newPayment.value = { name: '', amount: 0 }
}

const startEditing = (payment: FixedPayment) => {
  editingId.value = payment.id
  editedPayment.value = {
    name: payment.name,
    amount: centsToRands(payment.amount),
  }
}

const cancelEditing = () => {
  editingId.value = null
  editedPayment.value = { name: '', amount: 0 }
}

const handleUpdate = async (id: number) => {
  try {
    await updateFixedPayment(id, {
      name: editedPayment.value.name,
      amount: editedPayment.value.amount,
    })
    cancelEditing()
  } catch (error) {
    console.error('Failed to update fixed payment:', error)
  }
}

const handleDelete = async (id: number) => {
  openDialog({
    title: 'Delete Fixed Payment',
    message: 'Are you sure you want to delete this fixed payment?',
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      try {
        await deleteFixedPayment(id)
      } catch (error) {
        console.error('Failed to delete fixed payment:', error)
      }
    },
  })
}
</script>
