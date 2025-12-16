<script setup lang="ts">
import { formatCurrency, parseCurrency } from '~/utils/currency'

const props = defineProps<{
  amount: number
  isPaid?: boolean
  showCheckbox?: boolean
  editable?: boolean
  highlight?: boolean
  disabled?: boolean // Disables all interactions (for temp IDs syncing)
}>()

const emit = defineEmits<{
  (e: 'update:amount', value: number): void
  (e: 'update:isPaid', value: boolean): void
}>()

const isEditing = ref(false)
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEditing() {
  if (!props.editable || props.disabled) return
  inputValue.value = props.amount === 0 ? '' : formatCurrency(props.amount).replace('R', '').trim()
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function saveEditing() {
  const newAmount = parseCurrency(inputValue.value)
  isEditing.value = false
  if (newAmount !== props.amount) {
    emit('update:amount', newAmount)
  }
}

function cancelEditing() {
  // Revert to original value (just close without saving)
  isEditing.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveEditing()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelEditing()
  }
}

// Sanitize input to allow only valid currency format (max 2 decimals)
function handleInput(event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value

  // Remove any non-numeric characters except . and ,
  value = value.replace(/[^\d.,]/g, '')

  // Only allow one decimal separator
  const decimalMatch = value.match(/[.,]/)
  if (decimalMatch) {
    const parts = value.split(/[.,]/)
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    // Limit to 2 decimal places
    const [whole, decimal] = value.split(/[.,]/)
    if (decimal && decimal.length > 2) {
      value = whole + '.' + decimal.slice(0, 2)
    }
  }

  inputValue.value = value
}

function togglePaid() {
  if (props.disabled) return
  emit('update:isPaid', !props.isPaid)
}
</script>

<template>
  <div
    class="relative flex items-center gap-1 px-1 py-0.5 min-w-[100px] h-full"
    :class="{
      'bg-green-50 dark:bg-green-900/20': isPaid && showCheckbox,
      'bg-yellow-50 dark:bg-yellow-900/20': highlight && !isPaid,
    }"
  >
    <!-- Checkbox -->
    <button
      v-if="showCheckbox"
      @click="togglePaid"
      :disabled="disabled"
      class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
      :class="{ 'cursor-not-allowed opacity-50': disabled }"
    >
      <span
        class="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
        :class="isPaid
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-gray-300 dark:border-gray-600 hover:border-green-400'"
      >
        <svg v-if="isPaid" xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </span>
    </button>

    <!-- Amount -->
    <div class="flex-1 text-right">
      <input
        v-if="isEditing"
        ref="inputRef"
        v-model="inputValue"
        type="text"
        inputmode="decimal"
        class="w-full text-right text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
        @blur="cancelEditing"
        @keydown="handleKeydown"
        @input="handleInput"
      />
      <span
        v-else
        @click="startEditing"
        class="text-sm px-1 py-0.5 rounded text-gray-900 dark:text-gray-100"
        :class="{
          'text-gray-400 dark:text-gray-500': amount === 0 && editable,
          'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700': editable && !disabled,
          'cursor-not-allowed opacity-50': disabled,
        }"
      >
        {{ formatCurrency(amount) }}
      </span>
    </div>
  </div>
</template>
