<template>
  <div class="flex justify-center items-center" :class="containerClass">
    <div class="text-center">
      <div
        class="animate-spin rounded-full border-b-2 border-blue-500 mx-auto"
        :class="[sizeClass, text ? 'mb-4' : '']"
      ></div>
      <p v-if="text" class="text-gray-600 dark:text-gray-400">{{ text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  text: '',
  containerClass: '',
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-6 h-6'
    case 'lg':
      return 'w-12 h-12'
    default:
      return 'w-8 h-8'
  }
})
</script>
