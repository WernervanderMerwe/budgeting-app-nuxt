<script setup lang="ts">
import { formatCurrency, parseCurrency } from '~/utils/currency'

const props = defineProps<{
  amount: number
  isPaid?: boolean
  showCheckbox?: boolean
  editable?: boolean
  highlight?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:amount', value: number): void
  (e: 'update:isPaid', value: boolean): void
}>()

const isEditing = ref(false)
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEditing() {
  if (!props.editable) return
  inputValue.value = props.amount === 0 ? '' : formatCurrency(props.amount).replace('R', '').trim()
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function finishEditing() {
  isEditing.value = false
  const newAmount = parseCurrency(inputValue.value)
  if (newAmount !== props.amount) {
    emit('update:amount', newAmount)
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    finishEditing()
  } else if (event.key === 'Escape') {
    isEditing.value = false
  }
}

function togglePaid() {
  emit('update:isPaid', !props.isPaid)
}
</script>

<template>
  <div
    class="relative flex items-center gap-1 px-2 py-1 min-w-[100px]"
    :class="{
      'bg-green-50 dark:bg-green-900/20': isPaid && showCheckbox,
      'bg-yellow-50 dark:bg-yellow-900/20': highlight && !isPaid,
    }"
  >
    <!-- Checkbox -->
    <button
      v-if="showCheckbox"
      @click="togglePaid"
      class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
      :class="isPaid
        ? 'bg-green-500 border-green-500 text-white'
        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'"
    >
      <svg v-if="isPaid" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Amount -->
    <div class="flex-1 text-right">
      <input
        v-if="isEditing"
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="w-full text-right text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
        @blur="finishEditing"
        @keydown="handleKeydown"
      />
      <span
        v-else
        @click="startEditing"
        class="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded"
        :class="{
          'text-gray-400': amount === 0 && editable,
          'line-through text-gray-500': isPaid && showCheckbox,
        }"
      >
        {{ formatCurrency(amount) }}
      </span>
    </div>
  </div>
</template>
