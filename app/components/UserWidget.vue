<template>
  <!--
    Auth state lives in client-only state (useAuth's useState, fetched after
    mount), so the server can't know it. Rendering either branch during SSR
    guarantees a hydration mismatch once the client resolves the session.
    ClientOnly renders nothing on the server; the fallback reserves the avatar
    slot to avoid layout shift.
  -->
  <ClientOnly>
    <!-- Unauthenticated: Simple login button -->
    <NuxtLink
      v-if="!isAuthenticated"
      to="/login"
      class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      title="Sign in">
      <div
        class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
        U
      </div>
    </NuxtLink>

    <!-- Authenticated: Full dropdown menu -->
    <UDropdownMenu
      v-else
      :items="menuItems"
      :content="{ align: 'end' }"
      :ui="{ content: 'w-56' }">
      <button
        class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
        <div
          class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
          {{ userInitial }}
        </div>
        <svg
          class="w-4 h-4 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </UDropdownMenu>

    <!-- Placeholder while the session resolves client-side -->
    <template #fallback>
      <div
        class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 shadow-sm"
        aria-hidden="true"/>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  yearlyActions?: {
    onCopyMonth?: () => void
    onClearMonth?: () => void
    onToggleWarnings?: () => void
    showWarnings?: boolean
  }
}>()

const { user, signOut } = useAuth()

const isAuthenticated = computed(() => !!user.value)
const userEmail = computed(() => user.value?.email || 'User')
const userInitial = computed(() => {
  const email = user.value?.email
  if (!email) return 'U'
  return email.charAt(0).toUpperCase()
})

// Track if we're on a small screen (below lg breakpoint ~1024px)
const isSmallScreen = ref(false)

onMounted(() => {
  const checkScreenSize = () => {
    isSmallScreen.value = window.innerWidth < 1024
  }
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize)
  })
})

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}

const menuItems = computed(() => {
  const items: DropdownMenuItem[][] = []

  // User label header
  items.push([
    {
      label: userEmail.value,
      type: 'label' as const
    }
  ])

  // Add yearly actions only on small screens when they're provided
  if (isSmallScreen.value && props.yearlyActions) {
    const yearlyItems: DropdownMenuItem[] = []

    if (props.yearlyActions.onCopyMonth) {
      yearlyItems.push({
        label: 'Copy Month',
        icon: 'i-heroicons-document-duplicate',
        onClick: props.yearlyActions.onCopyMonth
      })
    }

    if (props.yearlyActions.onClearMonth) {
      yearlyItems.push({
        label: 'Clear Month',
        icon: 'i-heroicons-arrow-path',
        onClick: props.yearlyActions.onClearMonth
      })
    }

    if (props.yearlyActions.onToggleWarnings) {
      yearlyItems.push({
        label: props.yearlyActions.showWarnings ? 'Hide Warnings' : 'Show Warnings',
        icon: 'i-heroicons-exclamation-triangle',
        onClick: props.yearlyActions.onToggleWarnings
      })
    }

    if (yearlyItems.length > 0) {
      items.push(yearlyItems)
    }
  }

  // Add user guide link
  items.push([
    {
      label: 'User Guide',
      icon: 'i-heroicons-book-open',
      to: '/guide'
    }
  ])

  // Always add sign out
  items.push([
    {
      label: 'Sign out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onClick: handleSignOut
    }
  ])

  return items
})
</script>
