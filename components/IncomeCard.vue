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
    <form v-else @submit.prevent="handleSave" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Income Amount (R)
        </label>
        <input
          v-model.number="editedIncome"
          type="number"
          min="0"
          step="0.01"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

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

const isEditing = ref(false)
const isSaving = ref(false)
const editedIncome = ref(0)

const startEditing = () => {
  editedIncome.value = centsToRands(props.month.income)
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  editedIncome.value = 0
}

const handleSave = async () => {
  isSaving.value = true
  try {
    await updateMonth(props.month.id, {
      income: editedIncome.value,
    })
    isEditing.value = false
  } catch (error) {
    console.error('Failed to update income:', error)
  } finally {
    isSaving.value = false
  }
}
</script>
