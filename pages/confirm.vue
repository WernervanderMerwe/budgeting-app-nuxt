<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <UCard>
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Confirming your account...
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Please wait while we verify your credentials.
          </p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Confirmation failed
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ error }}
          </p>
          <UButton to="/login" variant="soft">
            Return to login
          </UButton>
        </div>

        <!-- Success State -->
        <div v-else class="text-center py-8">
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Account confirmed!
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Your account has been verified. Redirecting you now...
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

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    // Check for hash fragments (OAuth and email confirmation callbacks)
    const hash = window.location.hash

    if (hash) {
      // Parse the hash fragment for tokens
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const errorDescription = params.get('error_description')

      if (errorDescription) {
        error.value = errorDescription
        loading.value = false
        return
      }

      if (accessToken && refreshToken) {
        // Set the session from tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          error.value = sessionError.message
          loading.value = false
          return
        }
      }
    }

    // Wait a moment for session to be established
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if user is now authenticated
    if (user.value) {
      // Redirect to home/landing page
      await navigateTo('/')
    } else {
      // If no user after processing, something went wrong
      error.value = 'Unable to verify your account. Please try again.'
      loading.value = false
    }
  } catch (e: any) {
    error.value = e.message || 'An unexpected error occurred'
    loading.value = false
  }
})
</script>
