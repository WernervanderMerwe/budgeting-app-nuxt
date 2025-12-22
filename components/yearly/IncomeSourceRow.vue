<script setup lang="ts">
import type { YearlyIncomeSourceWithEntries, YearlyIncomeEntryWithDeductions, YearlyDeduction } from '~/types/yearly'
import { formatCurrency, centsToRands, randsToCents } from '~/utils/currency'
import { useColumnWidth } from '~/composables/useColumnResize'
import { isTempId } from '~/composables/useOptimisticUpdates'

const props = defineProps<{
  source: YearlyIncomeSourceWithEntries
}>()

const emit = defineEmits<{
  (e: 'update-entry', entryId: number, grossAmount: number): void
  (e: 'delete', sourceId: number): void
  (e: 'add-deduction', sourceId: number, deductionName: string): void
  (e: 'update-deduction', deductionId: number, data: { name?: string; amount?: number }): void
  (e: 'delete-deduction', deductionName: string, sourceId: number): void
  (e: 'rename', sourceId: number, newName: string): void
  (e: 'rename-deduction', oldName: string, newName: string, sourceId: number): void
}>()

const { columnWidth } = useColumnWidth()

const isExpanded = ref(false)
const isEditing = ref(false)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)
const isAddingDeduction = ref(false)
const newDeductionName = ref('')
const newDeductionInputRef = ref<HTMLInputElement | null>(null)

// Deduction name editing state
const editingDeductionName = ref<string | null>(null)
const editDeductionNameValue = ref('')
const editDeductionInputRef = ref<HTMLInputElement[]>([])

// Get unique deduction names across all months
const uniqueDeductionNames = computed(() => {
  const names = new Set<string>()
  for (const entry of props.source.entries) {
    for (const deduction of entry.deductions) {
      names.add(deduction.name)
    }
  }
  return Array.from(names)
})

// Check if source is syncing (has temp ID)
const isSourceSyncing = computed(() => isTempId(props.source.id))

// Check if an entry is syncing (source or entry has temp ID)
function isEntrySyncing(entry: YearlyIncomeEntryWithDeductions | undefined): boolean {
  if (!entry) return isTempId(props.source.id)
  return isTempId(props.source.id) || isTempId(entry.id)
}

// Check if a deduction is syncing (source, entry, or deduction has temp ID)
function isDeductionSyncing(entry: YearlyIncomeEntryWithDeductions | undefined, deduction: YearlyDeduction | undefined): boolean {
  if (!entry) return isTempId(props.source.id)
  if (!deduction) return isTempId(props.source.id) || isTempId(entry.id)
  return isTempId(props.source.id) || isTempId(entry.id) || isTempId(deduction.id)
}

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

function handleGrossUpdate(month: number, amountInRands: number) {
  const entry = getEntryForMonth(month)
  if (entry) {
    // Convert rands to cents for storage
    emit('update-entry', entry.id, randsToCents(amountInRands))
  }
}

// Get deduction for a specific month and name
function getDeductionForMonth(month: number, deductionName: string) {
  const entry = getEntryForMonth(month)
  return entry?.deductions.find(d => d.name === deductionName)
}

// Handle deduction amount update
function handleDeductionUpdate(month: number, deductionName: string, amountInRands: number) {
  const deduction = getDeductionForMonth(month, deductionName)
  if (deduction) {
    // Convert rands to cents for storage
    emit('update-deduction', deduction.id, { amount: randsToCents(amountInRands) })
  }
}

// Start adding a new deduction
function startAddingDeduction() {
  isAddingDeduction.value = true
  newDeductionName.value = ''
  nextTick(() => {
    newDeductionInputRef.value?.focus()
  })
}

function cancelAddingDeduction() {
  isAddingDeduction.value = false
  newDeductionName.value = ''
}

function saveNewDeduction() {
  const trimmedName = newDeductionName.value.trim()
  if (trimmedName) {
    emit('add-deduction', props.source.id, trimmedName)
  }
  isAddingDeduction.value = false
  newDeductionName.value = ''
}

function handleNewDeductionKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    saveNewDeduction()
  } else if (event.key === 'Escape') {
    cancelAddingDeduction()
  }
}

function handleDeleteDeduction(deductionName: string) {
  emit('delete-deduction', deductionName, props.source.id)
}

// Deduction name editing functions
function startEditingDeductionName(deductionName: string) {
  editingDeductionName.value = deductionName
  editDeductionNameValue.value = deductionName
  nextTick(() => {
    // In v-for, refs become arrays - only one input visible at a time
    const [input] = editDeductionInputRef.value
    input?.focus()
    input?.select()
  })
}

function cancelEditingDeductionName() {
  editingDeductionName.value = null
  editDeductionNameValue.value = ''
}

function saveDeductionNameEdit() {
  const trimmedName = editDeductionNameValue.value.trim()
  const oldName = editingDeductionName.value
  if (trimmedName && oldName && trimmedName !== oldName) {
    emit('rename-deduction', oldName, trimmedName, props.source.id)
  }
  editingDeductionName.value = null
  editDeductionNameValue.value = ''
}

function handleDeductionNameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    saveDeductionNameEdit()
  } else if (event.key === 'Escape') {
    cancelEditingDeductionName()
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
          class="text-sm font-medium truncate flex-1 min-w-0 text-gray-900 dark:text-white px-1 py-0.5 rounded"
          :class="isSourceSyncing ? 'opacity-70' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'"
          @click="!isSourceSyncing && startEditing()"
        >{{ source.name }}</span>
        <!-- Syncing spinner -->
        <svg
          v-if="isSourceSyncing"
          class="animate-spin h-3.5 w-3.5 text-green-500 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        <!-- Actions (absolute positioned) - hidden when editing or syncing -->
        <div
          v-if="!isEditing && !isSourceSyncing"
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
          <!-- Convert cents to rands for display -->
          <YearlyMonthCell
            :amount="centsToRands(getEntryForMonth(month)?.grossAmount ?? 0)"
            :editable="true"
            :disabled="isEntrySyncing(getEntryForMonth(month))"
            @update:amount="handleGrossUpdate(month, $event)"
          />
        </div>
      </div>
    </div>

    <!-- Expanded: Deductions and Net -->
    <template v-if="isExpanded">
      <!-- Deduction Rows -->
      <div
        v-for="deductionName in uniqueDeductionNames"
        :key="deductionName"
        class="group/deduction flex items-stretch border-b border-gray-100 dark:border-gray-800 bg-red-50/30 dark:bg-red-900/10"
      >
        <!-- Deduction Name (sticky) -->
        <div
          class="sticky left-0 z-10 relative flex items-center gap-1 pl-8 pr-2 py-1 bg-red-50/50 dark:bg-red-900/20 border-r border-gray-200 dark:border-gray-700"
          :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
        >
          <!-- Edit Mode for deduction name -->
          <span class="text-xs text-red-600 dark:text-red-400 flex-shrink-0">-</span>
          <input
            v-if="editingDeductionName === deductionName"
            ref="editDeductionInputRef"
            v-model="editDeductionNameValue"
            type="text"
            class="flex-1 min-w-0 text-xs px-1 py-0.5 border border-red-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            @keydown="handleDeductionNameKeydown"
            @blur="saveDeductionNameEdit"
          />
          <!-- Display Mode for deduction name -->
          <span
            v-else
            class="text-xs text-red-600 dark:text-red-400 truncate flex-1 px-1 py-0.5 rounded"
            :class="isSourceSyncing ? 'opacity-70' : 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30'"
            @click="!isSourceSyncing && startEditingDeductionName(deductionName)"
          >{{ deductionName }}</span>
          <!-- Delete deduction button - hidden when syncing -->
          <button
            v-if="editingDeductionName !== deductionName && !isSourceSyncing"
            @click.stop="handleDeleteDeduction(deductionName)"
            class="p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover/deduction:opacity-100 transition-opacity flex-shrink-0"
            title="Delete deduction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <!-- Deduction Amount Cells (editable) -->
        <div class="flex flex-1">
          <div
            v-for="month in 12"
            :key="month"
            class="flex-1 min-w-[100px] border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            <!-- Convert cents to rands for display -->
            <YearlyMonthCell
              :amount="centsToRands(getDeductionForMonth(month, deductionName)?.amount ?? 0)"
              :editable="true"
              :disabled="isDeductionSyncing(getEntryForMonth(month), getDeductionForMonth(month, deductionName))"
              class="text-red-600 dark:text-red-400"
              @update:amount="handleDeductionUpdate(month, deductionName, $event)"
            />
          </div>
        </div>
      </div>

      <!-- Add Deduction Button/Input -->
      <div class="flex items-stretch border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
        <div
          class="sticky left-0 z-10 flex items-center gap-1 pl-8 pr-2 py-1 bg-gray-50/50 dark:bg-gray-800/30 border-r border-gray-200 dark:border-gray-700"
          :style="{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }"
        >
          <!-- Input mode for adding deduction -->
          <input
            v-if="isAddingDeduction"
            ref="newDeductionInputRef"
            v-model="newDeductionName"
            type="text"
            placeholder="Deduction name..."
            class="flex-1 min-w-0 text-xs px-1 py-0.5 border border-red-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            @keydown="handleNewDeductionKeydown"
            @blur="saveNewDeduction"
          />
          <!-- Add button - disabled when syncing -->
          <button
            v-else
            @click.stop="!isSourceSyncing && startAddingDeduction()"
            :disabled="isSourceSyncing"
            class="flex items-center gap-1 text-xs"
            :class="isSourceSyncing ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-600'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Add Deduction
          </button>
        </div>
        <div class="flex-1"></div>
      </div>

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
            class="flex-1 min-w-[100px] px-1 py-2 text-right text-sm font-medium text-blue-700 dark:text-blue-300 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            {{ formatCurrency(centsToRands(getNetForMonth(month))) }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
