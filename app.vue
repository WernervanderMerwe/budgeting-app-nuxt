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
  htmlAttrs: {
    lang: 'en',
  },
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  ],
})

useSeoMeta({
  title: 'Basic Budget App',
  description: 'A simple budgeting application to track income, expenses, and savings goals',
  ogType: 'website',
  ogTitle: 'Basic Budget App',
  ogDescription: 'A simple budgeting application to track income, expenses, and savings goals',
  ogImage: '/og-image.svg',
  ogUrl: '/',
  ogSiteName: 'Basic Budget App',
  twitterCard: 'summary',
  twitterTitle: 'Basic Budget App',
  twitterDescription: 'A simple budgeting application to track income, expenses, and savings goals',
  twitterImage: '/og-image.svg',
})
</script>
