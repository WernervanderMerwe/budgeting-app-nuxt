<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Branding -->
      <div class="text-center">
        <div class="flex justify-center items-center gap-3 mb-4">
          <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <span class="text-3xl font-bold text-white">B</span>
          </div>
          <h1 class="text-3xl font-bold text-white">
            Budget App
          </h1>
        </div>
        <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Welcome back
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?
          <NuxtLink to="/signup" class="font-medium text-primary-600 hover:text-primary-500">
            Sign up for free
          </NuxtLink>
        </p>
      </div>

      <UCard>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <UFormGroup label="Email address" name="email">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              :disabled="isLoading"
              icon="i-heroicons-envelope"
            />
          </UFormGroup>

          <UFormGroup label="Password" name="password">
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter your password"
              required
              :disabled="isLoading"
              icon="i-heroicons-lock-closed"
            />
          </UFormGroup>

          <div class="flex items-center justify-end">
            <NuxtLink to="/reset-password" class="text-sm font-medium text-primary-600 hover:text-primary-500">
              Forgot your password?
            </NuxtLink>
          </div>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-circle"
          />

          <UButton
            type="submit"
            block
            size="lg"
            :loading="isLoading"
          >
            Sign in
          </UButton>
        </form>

        <!-- Future OAuth placeholder -->
        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-center text-gray-500 dark:text-gray-400">
            Social login options coming soon
          </p>
        </div>
      </UCard>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-500 dark:text-gray-400">
        Built by
        <a href="https://wernerbuildsapps.co.za" target="_blank" class="text-primary-600 hover:text-primary-500">
          Werner Builds Apps
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { signIn } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    await signIn(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e.message || 'Failed to sign in'
  } finally {
    isLoading.value = false
  }
}
</script>
