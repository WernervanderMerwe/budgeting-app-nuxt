<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Monthly Income
      </h2>
      <button
        v-if="!isEditing"
        @click="startEditing"
        class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
      >
        Edit
      </button>
    </div>

    <!-- Display Mode -->
    <div v-if="!isEditing">
      <p class="text-3xl font-bold text-green-600 dark:text-green-400">
        {{ formatCurrency(centsToRands(month.income)) }}
      </p>
    </div>

    <!-- Edit Mode -->
    <form
      v-else
      ref="editFormRef"
      @submit.prevent="handleSave"
      @focusout="handleEditFormFocusOut"
      class="space-y-4"
    >
      <CurrencyInput
        v-model="editedIncome"
        label="Income Amount (R)"
        required
        @enter="handleSave"
        @escape="cancelEditing"
      />

      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="cancelEditing"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSaving"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { Month } from '~/types/budget'
import { formatCurrency, centsToRands } from '~/utils/currency'

interface Props {
  month: Month
}

const props = defineProps<Props>()

const { updateMonth } = useMonths()
const { refreshSummary } = useBudget()

const isEditing = ref(false)
const isSaving = ref(false)
const editedIncome = ref(0)
const editFormRef = ref<HTMLFormElement | null>(null)

const startEditing = () => {
  editedIncome.value = centsToRands(props.month.income)
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  editedIncome.value = 0
}

const handleEditFormFocusOut = (event: FocusEvent) => {
  // Don't cancel if focus is moving to another element within the form
  const relatedTarget = event.relatedTarget as HTMLElement | null
  if (editFormRef.value && relatedTarget && editFormRef.value.contains(relatedTarget)) {
    return
  }
  // Focus left the form, cancel editing
  cancelEditing()
}

const handleSave = async () => {
  // Close form immediately (optimistic)
  isEditing.value = false

  // Start the update - optimistic update happens synchronously, then API call runs async
  const updatePromise = updateMonth(props.month.id, {
    income: editedIncome.value,
  })

  // Immediately recalculate summary based on optimistic update
  // This runs synchronously after the optimistic state change in updateMonth
  refreshSummary()

  // Wait for API to complete
  try {
    await updatePromise
  } catch (error) {
    // Rollback happened in updateMonth, refresh summary to reflect rollback
    refreshSummary()
    console.error('Failed to update income:', error)
  }
}
</script>
