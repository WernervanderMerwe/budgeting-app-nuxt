<template>
  <!-- Unauthenticated: Simple login button -->
  <NuxtLink
    v-if="!isAuthenticated"
    to="/login"
    class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    title="Sign in"
  >
    <div
      class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm"
    >
      U
    </div>
  </NuxtLink>

  <!-- Authenticated: Full dropdown menu -->
  <UDropdown
    v-else
    :items="menuItems"
    :popper="{ placement: 'bottom-end' }"
    :ui="{
      width: 'w-56'
    }"
  >
    <button
      class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    >
      <div
        class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm"
      >
        {{ userInitial }}
      </div>
      <svg
        class="w-4 h-4 text-gray-500 dark:text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Account header -->
    <template #header>
      <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
          {{ userEmail }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Signed in
        </p>
      </div>
    </template>

    <!-- Sign out item -->
    <template #item="{ item }">
      <div class="flex items-center gap-2">
        <UIcon v-if="item.icon" :name="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
      </div>
    </template>
  </UDropdown>
</template>

<script setup lang="ts">
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
  const items: any[][] = []

  // Add yearly actions only on small screens when they're provided
  if (isSmallScreen.value && props.yearlyActions) {
    const yearlyItems: any[] = []

    if (props.yearlyActions.onCopyMonth) {
      yearlyItems.push({
        label: 'Copy Month',
        icon: 'i-heroicons-document-duplicate',
        click: props.yearlyActions.onCopyMonth
      })
    }

    if (props.yearlyActions.onClearMonth) {
      yearlyItems.push({
        label: 'Clear Month',
        icon: 'i-heroicons-arrow-path',
        click: props.yearlyActions.onClearMonth
      })
    }

    if (props.yearlyActions.onToggleWarnings) {
      yearlyItems.push({
        label: props.yearlyActions.showWarnings ? 'Hide Warnings' : 'Show Warnings',
        icon: 'i-heroicons-exclamation-triangle',
        click: props.yearlyActions.onToggleWarnings
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
      click: handleSignOut
    }
  ])

  return items
})
</script>
