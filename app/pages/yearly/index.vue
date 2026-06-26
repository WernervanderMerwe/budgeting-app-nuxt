<script setup lang="ts">
import { getCurrentYear } from '~/utils/date'

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
    const targetYear = year ?? getCurrentYear()
    router.replace(`/yearly/${targetYear}`)
  } catch (error) {
    console.error('Error fetching latest year:', error)
    // Fallback to current year on error
    router.replace(`/yearly/${getCurrentYear()}`)
  }
})
</script>

<template>
  <div class="h-full bg-gray-50 dark:bg-gray-900">
    <LoadingSpinner
      size="lg"
      text="Loading..."
      container-class="h-full"
    />
  </div>
</template>
