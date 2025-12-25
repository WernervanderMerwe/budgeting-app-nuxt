<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-4 px-4">
      <div class="container mx-auto max-w-4xl flex justify-between items-center">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          <span>Back to App</span>
        </NuxtLink>

        <div class="flex items-center gap-4">
          <!-- Theme Toggle -->
          <ClientOnly>
            <button
              @click="toggleTheme"
              class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-5 h-5" />
            </button>
            <template #fallback>
              <div class="p-2 w-9 h-9"></div>
            </template>
          </ClientOnly>

          <UserWidget />
        </div>
      </div>
    </header>

    <!-- Guide Content -->
    <main ref="contentRef" class="container mx-auto max-w-4xl px-4 py-8">
      <ContentDoc path="/guide" class="prose prose-gray dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700 prose-img:cursor-zoom-in prose-img:hover:opacity-90 prose-img:transition-opacity prose-table:text-sm prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border-gray-200 dark:prose-td:border-gray-700">
        <template #not-found>
          <div class="text-center py-16">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UIcon name="i-heroicons-document-magnifying-glass" class="w-8 h-8 text-gray-400" />
            </div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Guide Not Available</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">The user guide content could not be loaded.</p>
            <NuxtLink
              to="/login"
              class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
              <span>Sign in to continue</span>
            </NuxtLink>
          </div>
        </template>
      </ContentDoc>
    </main>

    <!-- Footer -->
    <footer class="py-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
      Budget Tracker &copy; {{ currentYear }}
    </footer>

    <!-- Image Lightbox Modal -->
    <UModal v-model="lightboxOpen" fullscreen :ui="{ base: 'flex items-center justify-center', padding: 'p-0' }">
      <!-- Click outside wrapper -->
      <div class="fixed inset-0 flex items-center justify-center p-4 sm:p-8" @click="lightboxOpen = false">
        <div
          class="relative bg-gray-900 rounded-xl overflow-hidden max-w-[95vw] max-h-[95vh] border border-gray-600 shadow-2xl shadow-black/50"
          @click.stop
        >
          <!-- Close button -->
          <button
            @click="lightboxOpen = false"
            class="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors border border-gray-500"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>

          <!-- Full-size image -->
          <img
            :src="lightboxSrc"
            :alt="lightboxAlt"
            class="max-w-[90vw] max-h-[85vh] object-contain"
          />

          <!-- Caption -->
          <div v-if="lightboxAlt" class="p-4 text-center text-gray-300 bg-gray-900 border-t border-gray-700">
            {{ lightboxAlt }}
          </div>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { getCurrentYear } from '~/utils/date'

definePageMeta({
  layout: false // Use no layout since we're providing our own
})

const { isDark, toggleTheme } = useTheme()
const currentYear = getCurrentYear()

// Lightbox state
const lightboxOpen = ref(false)
const lightboxSrc = ref('')
const lightboxAlt = ref('')
const contentRef = ref<HTMLElement | null>(null)

// Open lightbox with clicked image
function openLightbox(img: HTMLImageElement) {
  lightboxSrc.value = img.src
  lightboxAlt.value = img.alt || ''
  lightboxOpen.value = true
}

// Attach click handlers to all images in the content
function attachImageHandlers() {
  if (contentRef.value) {
    const images = contentRef.value.querySelectorAll('img')
    images.forEach((img) => {
      // Avoid double-binding
      if (!img.dataset.lightbox) {
        img.dataset.lightbox = 'true'
        img.addEventListener('click', () => openLightbox(img as HTMLImageElement))
      }
    })
  }
}

onMounted(() => {
  // Initial attachment with delay for content to render
  setTimeout(attachImageHandlers, 1000)

  // Also use MutationObserver to catch dynamically rendered content
  if (contentRef.value) {
    const observer = new MutationObserver(() => {
      attachImageHandlers()
    })
    observer.observe(contentRef.value, { childList: true, subtree: true })
  }
})
</script>
