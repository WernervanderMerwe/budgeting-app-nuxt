<script setup lang="ts">
import { MONTH_NAMES_SHORT } from '~/types/yearly'
import type { YearlyIncomeSourceWithEntries } from '~/types/yearly'
import { formatCurrency } from '~/utils/currency'

const emit = defineEmits<{
  (e: 'add-source'): void
}>()

const { incomeSources, monthlyIncomeTotals, updateIncomeEntry, deleteIncomeSource } = useYearlyIncome()

const isExpanded = ref(true)

async function handleUpdateEntry(entryId: number, grossAmount: number) {
  await updateIncomeEntry(entryId, { grossAmount })
}

async function handleDeleteSource(sourceId: number) {
  if (confirm('Are you sure you want to delete this income source?')) {
    await deleteIncomeSource(sourceId)
  }
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
    <!-- Section Header -->
    <div
      class="flex items-stretch bg-green-100 dark:bg-green-900/30 cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <!-- Section Name (sticky) -->
      <div class="sticky left-0 z-10 flex items-center gap-2 min-w-[200px] w-[200px] px-3 py-3 bg-green-100 dark:bg-green-900/30 border-r border-gray-200 dark:border-gray-700">
        <button class="p-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform"
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
      <div class="flex flex-1">
        <div
          v-for="(total, index) in monthlyIncomeTotals"
          :key="index"
          class="flex-1 min-w-[100px] px-2 py-3 text-right text-sm font-medium text-green-700 dark:text-green-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
        >
          {{ formatCurrency(total.net) }}
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
      />

      <!-- Total Bruto Row -->
      <div class="flex items-stretch border-t border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
        <div class="sticky left-0 z-10 flex items-center min-w-[200px] w-[200px] px-3 py-2 bg-green-50 dark:bg-green-900/20 border-r border-gray-200 dark:border-gray-700">
          <span class="font-semibold text-green-700 dark:text-green-300">TOTAL NET</span>
        </div>
        <div class="flex flex-1">
          <div
            v-for="(total, index) in monthlyIncomeTotals"
            :key="index"
            class="flex-1 min-w-[100px] px-2 py-2 text-right text-sm font-bold text-green-700 dark:text-green-300 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            {{ formatCurrency(total.net) }}
          </div>
        </div>
      </div>

      <!-- Add Income Source Button -->
      <div class="flex border-t border-gray-200 dark:border-gray-700">
        <div class="sticky left-0 z-10 min-w-[200px] w-[200px] px-3 py-2 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
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
