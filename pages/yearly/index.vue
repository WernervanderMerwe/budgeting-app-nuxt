<script setup lang="ts">
// Redirect to the latest year with data, or current year if no data exists
definePageMeta({
  layout: 'yearly'
})

useHead({
  title: 'Yearly Overview'
})

const router = useRouter()

onMounted(async () => {
  try {
    const { year } = await $fetch<{ year: number | null }>('/api/yearly/latest')
    const targetYear = year ?? new Date().getFullYear()
    router.replace(`/yearly/${targetYear}`)
  } catch (error) {
    console.error('Error fetching latest year:', error)
    // Fallback to current year on error
    router.replace(`/yearly/${new Date().getFullYear()}`)
  }
})
</script>

<template>
  <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
</template>
