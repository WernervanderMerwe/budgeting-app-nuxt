<script setup lang="ts">
import { MONTH_NAMES_SHORT } from '~/types/yearly'
import type { YearlyIncomeSourceWithEntries } from '~/types/yearly'
import { formatCurrency, centsToRands } from '~/utils/currency'
import { useColumnWidth } from '~/composables/useColumnResize'

const emit = defineEmits<{
  (e: 'add-source'): void
}>()

const {
  incomeSources,
  monthlyIncomeTotals,
  updateIncomeEntry,
  updateIncomeSource,
  deleteIncomeSource,
  createDeduction,
  updateDeduction,
  deleteDeduction,
  getIncomeEntry
} = useYearlyIncome()
const { openDialog } = useConfirmDialog()
const { columnWidth } = useColumnWidth()

const isExpanded = ref(true)

async function handleUpdateEntry(entryId: number, grossAmount: number) {
  await updateIncomeEntry(entryId, { grossAmount })
}

async function handleRenameSource(sourceId: number, newName: string) {
  await updateIncomeSource(sourceId, { name: newName })
}

function handleDeleteSource(sourceId: number) {
  openDialog({
    title: 'Delete Income Source',
    message: 'Are you sure you want to delete this income source? All associated entries will be removed.',
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      await deleteIncomeSource(sourceId)
    }
  })
}

// Add a deduction for all 12 months of an income source (parallelized)
async function handleAddDeduction(sourceId: number, deductionName: string) {
  // Collect all promises for parallel execution
  const promises = []
  for (let month = 1; month <= 12; month++) {
    const entry = getIncomeEntry(sourceId, month)
    if (entry) {
      promises.push(createDeduction({
        incomeEntryId: entry.id,
        name: deductionName,
        amount: 0,
      }))
    }
  }
  // All optimistic updates applied immediately, APIs run in parallel
  await Promise.all(promises)
}

// Update a single deduction amount
async function handleUpdateDeduction(deductionId: number, data: { name?: string; amount?: number }) {
  await updateDeduction(deductionId, data)
}

// Delete all deductions with a given name across all months for an income source (parallelized)
function handleDeleteDeduction(deductionName: string, sourceId: number) {
  openDialog({
    title: 'Delete Deduction',
    message: `Are you sure you want to delete "${deductionName}" from all months?`,
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      // Find the income source
      const source = incomeSources.value.find(s => s.id === sourceId)
      if (!source) return

      // Collect all delete promises for parallel execution
      const promises = []
      for (const entry of source.entries) {
        const deduction = entry.deductions.find(d => d.name === deductionName)
        if (deduction) {
          promises.push(deleteDeduction(deduction.id))
        }
      }
      await Promise.all(promises)
    }
  })
}

// Rename all deductions with a given name across all months for an income source (parallelized)
async function handleRenameDeduction(oldName: string, newName: string, sourceId: number) {
  // Find the income source
  const source = incomeSources.value.find(s => s.id === sourceId)
  if (!source) return

  // Collect all update promises for parallel execution
  const promises = []
  for (const entry of source.entries) {
    const deduction = entry.deductions.find(d => d.name === oldName)
    if (deduction) {
      promises.push(updateDeduction(deduction.id, { name: newName }))
    }
  }
  await Promise.all(promises)
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
    <!-- Section Header -->
    <div
      class="flex items-stretch bg-green-100 dark:bg-green-800 cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <!-- Section Name (sticky) -->
      <div
        class="sticky left-0 z-10 flex items-center gap-2 px-2 py-2 bg-green-100 dark:bg-green-800 border-r border-gray-200 dark:border-gray-700"
        :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
      >
        <button class="p-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform text-green-700 dark:text-green-300"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span class="font-semibold text-green-800 dark:text-green-200">INCOME</span>
      </div>

      <!-- Month Headers -->
      <div class="flex flex-1 overflow-hidden">
        <div
          v-for="(total, index) in monthlyIncomeTotals"
          :key="index"
          class="flex-1 min-w-[115px] px-1 py-2 text-right text-sm font-medium text-green-700 dark:text-green-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
        >
          {{ formatCurrency(centsToRands(total.net)) }}
        </div>
      </div>
    </div>

    <!-- Income Sources -->
    <div v-show="isExpanded">
      <YearlyIncomeSourceRow
        v-for="source in incomeSources"
        :key="source.id"
        :source="source as YearlyIncomeSourceWithEntries"
        @update-entry="handleUpdateEntry"
        @delete="handleDeleteSource"
        @rename="handleRenameSource"
        @add-deduction="handleAddDeduction"
        @update-deduction="handleUpdateDeduction"
        @delete-deduction="handleDeleteDeduction"
        @rename-deduction="handleRenameDeduction"
      />

      <!-- Total Bruto Row -->
      <div class="flex items-stretch border-t border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-800">
        <div
          class="sticky left-0 z-10 flex items-center px-2 py-1 bg-green-50 dark:bg-green-800 border-r border-gray-200 dark:border-gray-700"
          :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
        >
          <span class="font-semibold text-green-700 dark:text-green-300">TOTAL NET</span>
        </div>
        <div class="flex flex-1 overflow-hidden">
          <div
            v-for="(total, index) in monthlyIncomeTotals"
            :key="index"
            class="flex-1 min-w-[115px] px-1 py-1 text-right text-sm font-bold text-green-700 dark:text-green-300 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            {{ formatCurrency(centsToRands(total.net)) }}
          </div>
        </div>
      </div>

      <!-- Add Income Source Button -->
      <div class="flex border-t border-gray-200 dark:border-gray-700">
        <div
          class="sticky left-0 z-10 px-2 py-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
          :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
        >
          <button
            @click.stop="emit('add-source')"
            class="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Add Income Source
          </button>
        </div>
        <div class="flex-1"></div>
      </div>
    </div>
  </div>
</template>
