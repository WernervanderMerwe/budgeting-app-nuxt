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
          Create your account
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Track income, expenses, and savings goals
        </p>
      </div>

      <UCard>
        <template v-if="!success">
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

            <UFormGroup label="Password" name="password" hint="Min 8 chars, 1 number, 1 special character">
              <UInput
                v-model="password"
                type="password"
                placeholder="Create a password"
                required
                :disabled="isLoading"
                icon="i-heroicons-lock-closed"
              />
            </UFormGroup>

            <UFormGroup label="Confirm Password" name="confirmPassword">
              <UInput
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                :disabled="isLoading"
                icon="i-heroicons-lock-closed"
              />
            </UFormGroup>

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
              Create account
            </UButton>
          </form>

          <!-- Trust Banner -->
          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div class="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-finger-print" class="w-4 h-4 text-green-500" />
                Pseudonymized
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-eye-slash" class="w-4 h-4 text-green-500" />
                No data selling
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-green-500" />
                Encrypted
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 text-green-500" />
                AI-scrape blocked
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
              Already have an account?
              <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </NuxtLink>
            </p>
          </div>
        </template>

        <!-- Success State -->
        <div v-else class="text-center py-6">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <UIcon name="i-heroicons-envelope" class="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Check your email
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-2">
            We've sent a confirmation link to
          </p>
          <p class="font-medium text-gray-900 dark:text-white mb-4">
            {{ email }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-500">
            Click the link in the email to activate your account and start budgeting.
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

const { signUp } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
const success = ref(false)

const validatePassword = (pwd: string): string | null => {
  if (pwd.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[0-9]/.test(pwd)) {
    return 'Password must contain at least one number'
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    return 'Password must contain at least one special character'
  }
  return null
}

const handleSubmit = async () => {
  error.value = ''

  // Validate password strength
  const passwordError = validatePassword(password.value)
  if (passwordError) {
    error.value = passwordError
    return
  }

  // Validate passwords match
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  isLoading.value = true

  try {
    await signUp(email.value, password.value)
    success.value = true
  } catch (e: any) {
    error.value = e.message || 'Failed to create account'
  } finally {
    isLoading.value = false
  }
}
</script>
