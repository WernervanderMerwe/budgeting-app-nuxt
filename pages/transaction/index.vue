<script setup lang="ts">
// Redirect to the latest year/month with data, or show welcome screen if no data

useHead({
  title: 'Transaction Tracker'
})

const router = useRouter()

onMounted(async () => {
  try {
    const { year, month } = await $fetch<{ id: number | null; year: number | null; month: number | null }>('/api/months/latest')
    if (year && month) {
      router.replace(`/transaction/${year}/${month}`)
    }
    // If no data, stay on this page and show welcome screen
  } catch (error) {
    console.error('Error fetching latest month:', error)
    // Stay on page, show welcome screen
  }
})

const { hasMonths, isLoadingMonths } = useMonths()
</script>

<template>
  <div>
    <!-- Loading State -->
    <LoadingSpinner
      v-if="isLoadingMonths"
      size="lg"
      text="Loading..."
      container-class="min-h-[60vh]"
    />

    <!-- Welcome / No Month State -->
    <div v-else class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="mb-6">
          <svg class="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Transaction Tracker
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ hasMonths ? 'Select a month from the sidebar to get started' : 'Create your first month to start budgeting' }}
        </p>
      </div>
    </div>
  </div>
</template>
