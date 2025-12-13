<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Simple Header -->
    <header class="py-6 px-4">
      <div class="container mx-auto flex justify-end">
        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Content - Centered -->
    <main class="flex-1 flex items-center justify-center px-4 pb-12">
      <div class="w-full max-w-4xl">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
      Budget Tracker &copy; {{ currentYear }}
    </footer>
  </div>
</template>

<script setup lang="ts">
import { getCurrentYear } from '~/utils/date'

const { isDark, toggleTheme } = useTheme()
const currentYear = getCurrentYear()
</script>
