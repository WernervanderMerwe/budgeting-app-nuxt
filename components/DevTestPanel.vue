<script setup lang="ts">
// Dev-only panel for testing error scenarios
// Only shows in development mode

const isOpen = ref(false)
const currentError = ref<string | null>(null)

const TEST_ERROR_KEY = 'dev_test_error'

onMounted(() => {
  currentError.value = localStorage.getItem(TEST_ERROR_KEY)
})

function setTestError(errorType: string | null) {
  if (errorType) {
    localStorage.setItem(TEST_ERROR_KEY, errorType)
  } else {
    localStorage.removeItem(TEST_ERROR_KEY)
  }
  currentError.value = errorType
}

const errorTypes = [
  { value: '400', label: '400 Bad Request' },
  { value: '500', label: '500 Server Error' },
  { value: 'timeout', label: 'Timeout (10s)' },
]
</script>

<template>
  <div v-if="$config.public.nodeEnv !== 'production'" class="fixed bottom-20 right-4 z-50">
    <!-- Toggle Button -->
    <button
      @click="isOpen = !isOpen"
      class="w-10 h-10 rounded-full bg-yellow-500 text-white shadow-lg flex items-center justify-center hover:bg-yellow-600"
      title="Dev Test Panel"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Panel -->
    <div
      v-if="isOpen"
      class="absolute bottom-12 right-0 w-64 bg-gray-800 text-white rounded-lg shadow-xl p-4"
    >
      <h3 class="font-bold text-yellow-400 mb-3">Test Error Panel</h3>

      <div class="space-y-2">
        <button
          v-for="err in errorTypes"
          :key="err.value"
          @click="setTestError(err.value)"
          class="w-full px-3 py-2 text-left text-sm rounded transition-colors"
          :class="currentError === err.value
            ? 'bg-red-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600'"
        >
          {{ err.label }}
          <span v-if="currentError === err.value" class="float-right">Active</span>
        </button>

        <button
          @click="setTestError(null)"
          class="w-full px-3 py-2 text-left text-sm rounded transition-colors"
          :class="!currentError
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600'"
        >
          Disable Errors
          <span v-if="!currentError" class="float-right">Active</span>
        </button>
      </div>

      <p class="text-xs text-gray-400 mt-3">
        API calls will {{ currentError ? `fail with ${currentError}` : 'work normally' }}
      </p>
    </div>
  </div>
</template>
