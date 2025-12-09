<template>
  <div>
    <!-- Coming Soon Placeholder -->
    <div class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center max-w-lg">
        <!-- Icon -->
        <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg class="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Yearly Overview
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          This feature is coming soon! The Yearly Overview will let you see all 12 months at a glance,
          track the 70/20/10 budget rule, and check off bills as you pay them.
        </p>

        <!-- Feature Preview -->
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-left mb-8">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">What's Coming:</h3>
          <ul class="space-y-3">
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-600 dark:text-gray-400">Multiple income sources with deductions</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-600 dark:text-gray-400">70/20/10 budget sections (Living, Non-Essential, Savings)</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-600 dark:text-gray-400">Categories with subcategories (e.g., Vehicle → Finance, Insurance)</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-600 dark:text-gray-400">Checkboxes to track paid/unpaid per month</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-600 dark:text-gray-400">Copy from previous month functionality</span>
            </li>
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-600 dark:text-gray-400">Spend target vs actual leftover comparison</span>
            </li>
          </ul>
        </div>

        <!-- Back to Home -->
        <NuxtLink
          to="/"
          class="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'yearly'
})
</script>
