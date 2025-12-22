<template>
  <div class="text-center">
    <!-- Logo/Title -->
    <div class="mb-12">
      <div class="flex justify-center items-center gap-3 mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
          <span class="text-4xl font-bold text-white">B</span>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
          Budget App
        </h1>
      </div>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        Track income, expenses, and savings goals with complete privacy
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
          <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Transaction Tracker
        </h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Track every transaction in detail. Perfect for monitoring daily expenses, categorizing spending, and seeing exactly where your money goes each month.
        </p>
        <div class="mt-6 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
          <span>Get Started</span>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </div>
      </NuxtLink>

      <!-- Yearly Overview Card -->
      <NuxtLink
        to="/yearly"
        class="group block p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 transition-all duration-200 hover:shadow-xl"
      >
        <div class="w-16 h-16 mx-auto mb-6 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
          <UIcon name="i-heroicons-calendar-days" class="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Yearly Overview
        </h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          View your entire year at a glance. Track recurring payments, manage the 70/20/10 budget rule, and check off bills as you pay them month by month.
        </p>
        <div class="mt-6 flex items-center justify-center text-green-600 dark:text-green-400 font-medium">
          <span>Get Started</span>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </div>
      </NuxtLink>
    </div>

    <!-- Privacy & Security Section -->
    <div class="mt-16 max-w-3xl mx-auto">
      <div class="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border border-green-200 dark:border-green-800/30">
        <div class="flex items-center justify-center gap-2 mb-4">
          <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-green-600 dark:text-green-500" />
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Your Privacy Matters</h3>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
          We use bank-grade privacy measures to keep your financial data safe and separate from your identity.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 dark:bg-green-500/20 flex items-center justify-center">
              <UIcon name="i-heroicons-finger-print" class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">Pseudonymized Data</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Your financial data is stored separately from your identity using random tokens</p>
              <a
                href="https://en.wikipedia.org/wiki/Pseudonymization"
                target="_blank"
                class="text-xs text-green-600 dark:text-green-500 hover:text-green-500 dark:hover:text-green-400 inline-flex items-center gap-1 mt-1"
              >
                Learn more
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
              </a>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 dark:bg-green-500/20 flex items-center justify-center">
              <UIcon name="i-heroicons-building-library" class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">No Bank Access Needed</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Manual entry means your bank credentials stay with your bank</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 dark:bg-green-500/20 flex items-center justify-center">
              <UIcon name="i-heroicons-eye-slash" class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">We Never Sell Data</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Your information is never shared with third parties or advertisers</p>
            </div>
          </div>
        </div>

        <!-- Additional protection note -->
        <div class="mt-6 pt-4 border-t border-green-200 dark:border-green-800/30 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 text-green-600 dark:text-green-500" />
          <span>AI scraping blocked - your data won't be used for AI training</span>
        </div>
      </div>
    </div>

    <!-- Features Summary -->
    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-left">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-lock-closed" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Encrypted Connection</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">All data encrypted in transit</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Fast & Simple</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">No complicated setup</p>
        </div>
      </div>

      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Clear Insights</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">See your spending trends</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-16 space-y-2">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Built by
        <a href="https://wernerbuildsapps.co.za" target="_blank" class="text-green-500 hover:text-green-400">
          Werner Builds Apps
        </a>
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Report any issues or suggestions
        <a href="mailto:wernerbuildsapps@gmail.com" class="text-green-500 hover:text-green-400">
          here
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'landing'
})
</script>
