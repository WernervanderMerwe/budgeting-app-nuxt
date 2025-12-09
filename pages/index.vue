<template>
  <div class="text-center">
    <!-- Logo/Title -->
    <div class="mb-12">
      <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-600 flex items-center justify-center">
        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-3">
        Budget Tracker
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        Take control of your finances with detailed tracking or a bird's eye view of your year
      </p>
    </div>

    <!-- Mode Selection Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <!-- Transaction Tracker Card -->
      <NuxtLink
        to="/transaction"
        class="group block p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all duration-200 hover:shadow-xl"
      >
        <div class="w-16 h-16 mx-auto mb-6 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Transaction Tracker
        </h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Track every transaction in detail. Perfect for monitoring daily expenses, categorizing spending, and seeing exactly where your money goes each month.
        </p>
        <div class="mt-6 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
          <span>Get Started</span>
          <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>

      <!-- Yearly Overview Card -->
      <NuxtLink
        to="/yearly"
        class="group block p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 transition-all duration-200 hover:shadow-xl"
      >
        <div class="w-16 h-16 mx-auto mb-6 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Yearly Overview
        </h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          View your entire year at a glance. Track recurring payments, manage the 70/20/10 budget rule, and check off bills as you pay them month by month.
        </p>
        <div class="mt-6 flex items-center justify-center text-green-600 dark:text-green-400 font-medium">
          <span>Get Started</span>
          <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>
    </div>

    <!-- Features Summary -->
    <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-left">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Private & Secure</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Your data stays yours</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <svg class="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Fast & Simple</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">No complicated setup</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <svg class="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Clear Insights</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">See your spending trends</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'landing'
})
</script>
