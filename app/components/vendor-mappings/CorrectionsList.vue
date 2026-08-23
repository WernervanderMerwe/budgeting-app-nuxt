<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-1">Unrecognised slips</h2>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      When a receipt's brand isn't recognised, the app falls back to whatever you typed. Rows here
      are recurring garbles worth teaching the parser about - add a regex to
      <code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">shared/utils/receipt-merchants.ts</code>
      for the ones seen most, then mark them fixed.
    </p>

    <!-- Loading State -->
    <LoadingSpinner
      v-if="correctionsLoading && corrections.length === 0"
      size="md"
      text="Loading corrections..."
      container-class="py-10"/>

    <!-- Error State -->
    <div v-else-if="correctionsError">
      <ErrorAlert :message="correctionsError" title="Couldn't load receipt corrections" />
      <button
        class="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        @click="fetchCorrections">
        Retry
      </button>
    </div>

    <!-- Empty State (the good outcome) -->
    <div v-else-if="corrections.length === 0" class="text-center py-10">
      <svg class="w-12 h-12 mx-auto text-green-500 dark:text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-700 dark:text-gray-300 text-sm font-medium">Nothing to review</p>
      <p class="text-gray-500 dark:text-gray-500 text-xs mt-1">Every scanned receipt has been recognised.</p>
    </div>

    <!-- Corrections List -->
    <ul v-else class="space-y-2">
      <li
        v-for="row in corrections"
        :key="row.id"
        class="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <span class="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">"{{ row.rawText }}"</span>
          <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span class="text-sm font-medium text-gray-900 dark:text-white truncate">"{{ row.correctedTo }}"</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">seen {{ row.timesSeen }}&times;</span>
          <span
            class="text-xs text-gray-400 dark:text-gray-500"
            :title="formatDate(row.lastSeenAt, 'long')">
            {{ getRelativeTime(row.lastSeenAt) }}
          </span>
        </div>
        <button
          :disabled="resolvingId === row.id"
          class="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleResolve(row.id)">
          Mark fixed
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { getRelativeTime, formatDate } from '~/utils/date'

const { corrections, correctionsLoading, correctionsError, fetchCorrections, resolveCorrection } =
  useVendorMappings()

const resolvingId = ref<number | null>(null)

async function handleResolve(id: number) {
  resolvingId.value = id
  try {
    await resolveCorrection(id)
  } catch (error) {
    console.error('Failed to resolve correction:', error)
  } finally {
    resolvingId.value = null
  }
}

onMounted(() => {
  fetchCorrections()
})
</script>
