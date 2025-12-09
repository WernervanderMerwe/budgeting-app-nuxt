<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="px-4 py-4 flex items-center justify-between">
      <!-- App Title -->
      <div class="flex items-center space-x-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Budget Tracker
        </h1>
        <span v-if="currentMonth" class="text-sm text-gray-500 dark:text-gray-400">
          / {{ currentMonth.name }}
        </span>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-4">
        <!-- Theme Toggle -->
        <ClientOnly>
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <!-- Sun icon (shown when in dark mode - click to switch to light) -->
            <svg
              v-if="isDark"
              class="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <!-- Moon icon (shown when in light mode - click to switch to dark) -->
            <svg
              v-else
              class="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </button>
          <template #fallback>
            <div class="w-9 h-9 p-2">
              <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse"></div>
            </div>
          </template>
        </ClientOnly>

        <!-- User Menu (placeholder for future auth) -->
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()
const { currentMonth } = useMonths()
</script>
