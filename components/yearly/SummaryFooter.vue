<script setup lang="ts">
import { formatCurrency, parseCurrency } from '~/utils/currency'

const { currentBudget, updateBudget } = useYearlyBudget()
const { monthlySummaries, getLeftoverClass } = useYearlySummary()

const isEditingTarget = ref<number | null>(null)
const editTargetValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEditingTarget(month: number) {
  if (!currentBudget.value) return
  isEditingTarget.value = month
  editTargetValue.value = formatCurrency(currentBudget.value.spendTarget).replace('R', '').trim()
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

async function finishEditingTarget() {
  if (!currentBudget.value || isEditingTarget.value === null) return
  const newTarget = parseCurrency(editTargetValue.value)
  if (newTarget !== currentBudget.value.spendTarget) {
    await updateBudget(currentBudget.value.id, { spendTarget: newTarget })
  }
  isEditingTarget.value = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    finishEditingTarget()
  } else if (event.key === 'Escape') {
    isEditingTarget.value = null
  }
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <!-- Spend Target Row -->
    <div class="flex items-stretch border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
      <div class="sticky left-0 z-10 flex items-center min-w-[200px] w-[200px] px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border-r border-gray-200 dark:border-gray-700">
        <span class="font-semibold text-orange-700 dark:text-orange-300">Spend Target</span>
      </div>
      <div class="flex flex-1">
        <div
          v-for="(summary, index) in monthlySummaries"
          :key="index"
          class="flex-1 min-w-[100px] px-2 py-2 text-right border-r border-gray-100 dark:border-gray-800 last:border-r-0"
        >
          <input
            v-if="isEditingTarget === summary.month"
            ref="inputRef"
            v-model="editTargetValue"
            type="text"
            class="w-full text-right text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
            @blur="finishEditingTarget"
            @keydown="handleKeydown"
          />
          <span
            v-else
            @click="startEditingTarget(summary.month)"
            class="text-sm cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 px-1 py-0.5 rounded text-orange-700 dark:text-orange-300"
          >
            {{ formatCurrency(summary.spendTarget) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Monthly Leftover Row -->
    <div class="flex items-stretch bg-purple-50 dark:bg-purple-900/20">
      <div class="sticky left-0 z-10 flex items-center min-w-[200px] w-[200px] px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-r border-gray-200 dark:border-gray-700">
        <span class="font-semibold text-purple-700 dark:text-purple-300">Monthly Leftover</span>
      </div>
      <div class="flex flex-1">
        <div
          v-for="(summary, index) in monthlySummaries"
          :key="index"
          class="flex-1 min-w-[100px] px-2 py-2 text-right text-sm font-bold border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          :class="getLeftoverClass(summary.leftover)"
        >
          {{ formatCurrency(summary.leftover) }}
        </div>
      </div>
    </div>
  </div>
</template>
