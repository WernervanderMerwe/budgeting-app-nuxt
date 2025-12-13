<script setup lang="ts">
import type { YearlyIncomeSourceWithEntries } from '~/types/yearly'
import { formatCurrency, parseCurrency } from '~/utils/currency'
import { useColumnWidth } from '~/composables/useColumnResize'

const props = defineProps<{
  source: YearlyIncomeSourceWithEntries
}>()

const emit = defineEmits<{
  (e: 'update-entry', entryId: number, grossAmount: number): void
  (e: 'delete', sourceId: number): void
  (e: 'add-deduction', entryId: number): void
  (e: 'update-deduction', deductionId: number, data: { name?: string; amount?: number }): void
  (e: 'delete-deduction', deductionId: number): void
  (e: 'rename', sourceId: number, newName: string): void
}>()

const { columnWidth } = useColumnWidth()

const isExpanded = ref(false)
const isEditing = ref(false)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

function startEditing() {
  editName.value = props.source.name
  isEditing.value = true
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function cancelEditing() {
  isEditing.value = false
  editName.value = ''
}

function saveEdit() {
  const trimmedName = editName.value.trim()
  if (trimmedName && trimmedName !== props.source.name) {
    emit('rename', props.source.id, trimmedName)
  }
  isEditing.value = false
  editName.value = ''
}

function handleEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    saveEdit()
  } else if (event.key === 'Escape') {
    cancelEditing()
  }
}

function getEntryForMonth(month: number) {
  return props.source.entries.find(e => e.month === month)
}

function getNetForMonth(month: number): number {
  const entry = getEntryForMonth(month)
  if (!entry) return 0
  const totalDeductions = entry.deductions.reduce((sum, d) => sum + d.amount, 0)
  return entry.grossAmount - totalDeductions
}

function handleGrossUpdate(month: number, amount: number) {
  const entry = getEntryForMonth(month)
  if (entry) {
    emit('update-entry', entry.id, amount)
  }
}
</script>

<template>
  <div>
    <!-- Income Source Row -->
    <div class="group flex items-stretch border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <!-- Source Name (sticky) -->
      <div
        class="sticky left-0 z-10 relative flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
        :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
      >
        <button
          @click="isExpanded = !isExpanded"
          class="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform text-gray-500 dark:text-gray-300"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <!-- Edit Mode -->
        <input
          v-if="isEditing"
          ref="editInputRef"
          v-model="editName"
          type="text"
          class="flex-1 min-w-0 text-sm px-1 py-0.5 border border-green-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          @keydown="handleEditKeydown"
          @blur="saveEdit"
        />

        <!-- Display Mode -->
        <span
          v-else
          class="text-sm font-medium truncate flex-1 min-w-0 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded"
          @click="startEditing"
        >{{ source.name }}</span>

        <!-- Actions (absolute positioned) - hidden when editing -->
        <div
          v-if="!isEditing"
          class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white dark:bg-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            @click.stop="emit('delete', source.id)"
            class="p-1 text-gray-400 hover:text-red-500"
            title="Delete income source"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Gross Income Cells -->
      <div class="flex flex-1">
        <div
          v-for="month in 12"
          :key="month"
          class="flex-1 min-w-[100px] border-r border-gray-100 dark:border-gray-800 last:border-r-0"
        >
          <YearlyMonthCell
            :amount="getEntryForMonth(month)?.grossAmount ?? 0"
            :editable="true"
            @update:amount="handleGrossUpdate(month, $event)"
          />
        </div>
      </div>
    </div>

    <!-- Expanded: Deductions and Net -->
    <template v-if="isExpanded">
      <!-- Deductions per month's entry -->
      <template v-for="month in 12" :key="`deductions-${month}`">
        <template v-for="deduction in getEntryForMonth(month)?.deductions ?? []" :key="deduction.id">
          <div
            v-if="month === 1"
            class="flex items-stretch border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30"
          >
            <div
              class="sticky left-0 z-10 flex items-center gap-2 pl-8 pr-3 py-1 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700"
              :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
            >
              <span class="text-xs text-gray-500">- {{ deduction.name }}</span>
            </div>
            <div class="flex flex-1">
              <div
                v-for="m in 12"
                :key="m"
                class="flex-1 min-w-[100px] px-2 py-1 text-right text-xs text-gray-500 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
              >
                {{ formatCurrency(source.entries.find(e => e.month === m)?.deductions.find(d => d.name === deduction.name)?.amount ?? 0) }}
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- Net Income Row -->
      <div class="flex items-stretch border-b border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20">
        <div
          class="sticky left-0 z-10 flex items-center gap-2 pl-8 pr-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-r border-gray-200 dark:border-gray-700"
          :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
        >
          <span class="text-sm font-medium text-blue-700 dark:text-blue-300">= Net</span>
        </div>
        <div class="flex flex-1">
          <div
            v-for="month in 12"
            :key="month"
            class="flex-1 min-w-[100px] px-2 py-2 text-right text-sm font-medium text-blue-700 dark:text-blue-300 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            {{ formatCurrency(getNetForMonth(month)) }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
