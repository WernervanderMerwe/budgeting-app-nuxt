<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <UCard>
        <div v-if="error" class="text-center py-8">
          <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Sign-in failed
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ error }}
          </p>
          <UButton to="/login" variant="soft">
            Return to login
          </UButton>
        </div>

        <div v-else class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Signing you in...
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            One moment while we verify your link.
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { fetchSession } = useAuth()
const route = useRoute()

const error = ref('')

onMounted(async () => {
  // better-auth redirects back with ?error=... if the link is invalid/expired.
  if (route.query.error) {
    error.value = 'We could not verify your sign-in link. It may have expired.'
    return
  }

  try {
    const user = await fetchSession()
    if (user) {
      await navigateTo('/')
    } else {
      error.value = 'We could not verify your sign-in link. It may have expired.'
    }
  } catch (e) {
    error.value = (e as Error).message || 'An unexpected error occurred'
  }
})
</script>
