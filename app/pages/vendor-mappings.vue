<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-4 px-4">
      <div class="container mx-auto max-w-5xl flex justify-between items-center">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          <span>Back to App</span>
        </NuxtLink>

        <div class="flex items-center gap-4">
          <!-- Theme Toggle -->
          <ClientOnly>
            <button
              class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleTheme">
              <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-5 h-5" />
            </button>
            <template #fallback>
              <div class="p-2 w-9 h-9"/>
            </template>
          </ClientOnly>

          <UserWidget />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto max-w-5xl px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">Vendor Mappings</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Review and correct which expense category each vendor gets scanned into, and clean up
        receipt text the parser didn't recognise.
      </p>

      <div class="space-y-8">
        <VendorMappingsVendorList />
        <VendorMappingsCorrectionsList />
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-6 text-center space-y-1 border-t border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Version: <span class="text-[10px] align-baseline">{{ appVersion }}</span>
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Budget Tracker &copy; {{ currentYear }}
      </p>
    </footer>

    <!-- Global Confirm Dialog - layout: false means the layouts' copy isn't mounted -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { getCurrentYear } from '~/utils/date'

definePageMeta({
  layout: false, // Standalone page, not month/year-scoped - the default layout bundles MonthSidebar
})

useHead({ title: 'Vendor Mappings' })

const { isDark, toggleTheme } = useTheme()
const currentYear = getCurrentYear()
const { appVersion } = useRuntimeConfig().public
</script>
