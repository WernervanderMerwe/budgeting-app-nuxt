<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// Initialize theme on app mount
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})

// SEO Meta Tags
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} | Budget App` : 'Budget App'
  },
  htmlAttrs: {
    lang: 'en',
  },
})

useSeoMeta({
  description: 'A simple budgeting application to track income, expenses, and savings goals',
  ogType: 'website',
  ogTitle: 'Budget App',
  ogDescription: 'A simple budgeting application to track income, expenses, and savings goals',
  ogImage: '/og-image.svg',
  ogUrl: '/',
  ogSiteName: 'Budget App',
  twitterCard: 'summary',
  twitterTitle: 'Budget App',
  twitterDescription: 'A simple budgeting application to track income, expenses, and savings goals',
  twitterImage: '/og-image.svg',
})
</script>
