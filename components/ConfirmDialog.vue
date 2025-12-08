<template>
  <Teleport to="body">
    <div
      v-if="state.isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {{ state.title }}
        </h2>

        <p class="text-gray-700 dark:text-gray-300 mb-6">
          {{ state.message }}
        </p>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="closeDialog"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirm"
            :class="[
              'px-4 py-2 text-white rounded-lg font-medium transition-colors',
              state.confirmColor === 'red'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            ]"
          >
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { state, closeDialog, confirm } = useConfirmDialog()
</script>
