<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Branding -->
      <div class="text-center">
        <div class="flex justify-center items-center gap-3 mb-4">
          <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <span class="text-3xl font-bold text-white">B</span>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Budget App
          </h1>
        </div>
        <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Sign in
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We'll email you a magic link — no password needed.
        </p>
        <NuxtLink
          to="/guide"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Check out the User Guide first</span>
        </NuxtLink>
      </div>

      <UCard>
        <!-- Sent confirmation state -->
        <div v-if="sent" class="text-center py-6">
          <UIcon name="i-heroicons-envelope-open" class="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Check your email
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            We sent a sign-in link to <span class="font-medium">{{ email }}</span>. Click it to continue.
          </p>
          <UButton variant="soft" @click="() => { sent = false }">
            Use a different email
          </UButton>
        </div>

        <!-- Email entry form -->
        <form v-else class="space-y-6" @submit.prevent="handleSubmit">
          <UFormField label="Email address" name="email">
            <UInput
              v-model="email"
              class="w-full"
              type="email"
              placeholder="you@example.com"
              required
              :disabled="isLoading"
              icon="i-heroicons-envelope"/>
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-circle"/>

          <UButton
            type="submit"
            block
            size="lg"
            :loading="isLoading">
            Send magic link
          </UButton>
        </form>
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

const { sendMagicLink } = useAuth()

const email = ref('')
const error = ref('')
const isLoading = ref(false)
const sent = ref(false)

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    await sendMagicLink(email.value)
    sent.value = true
  } catch (e) {
    error.value = (e as Error).message || 'Failed to send magic link'
  } finally {
    isLoading.value = false
  }
}
</script>
