<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Month Sidebar -->
    <MonthSidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <AppHeader />

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div class="container mx-auto px-4 py-6">
          <slot />
        </div>
      </main>
    </div>

    <!-- Global Confirm Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
// Components will be auto-imported by Nuxt
</script>
