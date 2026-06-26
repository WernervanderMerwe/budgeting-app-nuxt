<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {{ isRecoveryMode ? 'Set new password' : 'Reset your password' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-500">
            Back to sign in
          </NuxtLink>
        </p>
      </div>

      <UCard>
        <!-- Request Reset Form -->
        <template v-if="!isRecoveryMode && !emailSent">
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form @submit.prevent="handleRequestReset" class="space-y-6">
            <UFormGroup label="Email address" name="email">
              <UInput
                v-model="email"
                type="email"
                placeholder="you@example.com"
                required
                :disabled="isLoading"
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
              :loading="isLoading"
            >
              Send reset link
            </UButton>
          </form>
        </template>

        <!-- Email Sent Confirmation -->
        <div v-else-if="emailSent && !isRecoveryMode" class="text-center py-4">
          <UIcon name="i-heroicons-envelope" class="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Check your email
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            We've sent a password reset link to <strong>{{ email }}</strong>
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-500">
            Click the link in the email to reset your password.
          </p>
        </div>

        <!-- Update Password Form (Recovery Mode) -->
        <template v-else-if="isRecoveryMode && !passwordUpdated">
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Enter your new password below.
          </p>

          <form @submit.prevent="handleUpdatePassword" class="space-y-6">
            <UFormGroup label="New Password" name="password" hint="Minimum 6 characters">
              <UInput
                v-model="newPassword"
                type="password"
                placeholder="Enter new password"
                required
                :disabled="isLoading"
              />
            </UFormGroup>

            <UFormGroup label="Confirm Password" name="confirmPassword">
              <UInput
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                required
                :disabled="isLoading"
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
              :loading="isLoading"
            >
              Update password
            </UButton>
          </form>
        </template>

        <!-- Password Updated Success -->
        <div v-else-if="passwordUpdated" class="text-center py-4">
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Password updated!
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Your password has been successfully updated.
          </p>
          <UButton to="/login" variant="soft">
            Sign in with new password
          </UButton>
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
const { resetPassword, updatePassword } = useAuth()

const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
const emailSent = ref(false)
const passwordUpdated = ref(false)
const isRecoveryMode = ref(false)

// Check if this is a password recovery callback
onMounted(async () => {
  const hash = window.location.hash

  if (hash) {
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type === 'recovery' && accessToken && refreshToken) {
      // Set the session for password update
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (!sessionError) {
        isRecoveryMode.value = true
      } else {
        error.value = 'Invalid or expired reset link. Please request a new one.'
      }
    }
  }
})

const handleRequestReset = async () => {
  error.value = ''
  isLoading.value = true

  try {
    await resetPassword(email.value)
    emailSent.value = true
  } catch (e: any) {
    error.value = e.message || 'Failed to send reset link'
  } finally {
    isLoading.value = false
  }
}

const handleUpdatePassword = async () => {
  error.value = ''

  // Validate passwords match
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  // Validate password length
  if (newPassword.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  isLoading.value = true

  try {
    await updatePassword(newPassword.value)
    passwordUpdated.value = true
  } catch (e: any) {
    error.value = e.message || 'Failed to update password'
  } finally {
    isLoading.value = false
  }
}
</script>
