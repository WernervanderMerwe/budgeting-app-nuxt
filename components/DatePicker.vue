<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar'
import 'v-calendar/dist/style.css'
import dayjs from 'dayjs'

const props = withDefaults(defineProps<{
  modelValue: string // ISO date string (YYYY-MM-DD)
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  class?: string
}>(), {
  placeholder: 'Select date',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)

// Convert string to Date for v-calendar (v-calendar requires Date objects)
const dateValue = computed({
  get: () => props.modelValue ? dayjs(props.modelValue).toDate() : null,
  set: (value: Date | null) => {
    if (value) {
      emit('update:modelValue', dayjs(value).format('YYYY-MM-DD'))
    }
    isOpen.value = false
  }
})

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  return dayjs(props.modelValue).format('D MMM YYYY')
})

const calendarAttrs = {
  transparent: true,
  borderless: true,
  color: 'blue',
  'is-dark': { selector: 'html', darkClass: 'dark' },
  'first-day-of-week': 1,
}
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
    </label>

    <UPopover v-model:open="isOpen" :popper="{ placement: 'bottom-start' }">
      <UButton
        :disabled="disabled"
        variant="outline"
        color="white"
        block
        :class="['justify-between', props.class]"
        :ui="{
          padding: { sm: 'px-3 py-2' },
          color: { white: { outline: 'ring-1 ring-gray-300 dark:ring-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white' } }
        }"
      >
        <span :class="displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">
          {{ displayValue || placeholder }}
        </span>
        <UIcon name="i-heroicons-calendar-days-20-solid" class="w-5 h-5 text-gray-400" />
      </UButton>

      <template #panel>
        <VCalendarDatePicker
          v-model="dateValue"
          v-bind="calendarAttrs"
        />
      </template>
    </UPopover>
  </div>
</template>
