<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  class?: string
}>(), {
  placeholder: 'e.g., 1000.00',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Sync inputValue with modelValue
watch(() => props.modelValue, (newVal) => {
  if (document.activeElement !== inputRef.value) {
    inputValue.value = newVal === 0 ? '' : newVal.toFixed(2)
  }
}, { immediate: true })

// Sanitize input: only numbers, one decimal, max 2 decimal places
function handleInput(event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value

  // Remove non-numeric except . and ,
  value = value.replace(/[^\d.,]/g, '')

  // Only allow one decimal separator
  const parts = value.split(/[.,]/)
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }

  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].slice(0, 2)
  }

  inputValue.value = value

  // Emit parsed number
  const parsed = parseFloat(value.replace(',', '.')) || 0
  emit('update:modelValue', Math.round(parsed * 100) / 100)
}

function handleBlur() {
  // Format on blur
  const parsed = parseFloat(inputValue.value.replace(',', '.')) || 0
  inputValue.value = parsed === 0 ? '' : parsed.toFixed(2)
}
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
    </label>
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      inputmode="decimal"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="[
        'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.class
      ]"
      @input="handleInput"
      @blur="handleBlur"
    />
  </div>
</template>
