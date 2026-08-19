<template>
  <div class="mb-3">
    <!-- Dropzone -->
    <div
      class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
      :class="[
        dragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500',
        isScanning ? 'opacity-60 pointer-events-none' : ''
      ]"
      @click="fileInput?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop">
      <template v-if="isScanning">
        <svg class="animate-spin h-6 w-6 mx-auto text-blue-600 dark:text-blue-400 mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Reading slip...
        </p>
      </template>
      <template v-else>
        <svg class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Drop a slip or invoice here
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Photo or PDF &mdash; or click to choose
        </p>
      </template>

      <input
        ref="fileInput"
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        class="hidden"
        @change="onFileSelect">
    </div>

    <p v-if="error" class="mt-2 text-xs text-red-600 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ParsedReceipt } from '~~/shared/utils/receipt-types'

/** What the server returns; `source` tells us whether it came from a text layer. */
interface ScanResponse extends ParsedReceipt {
  source: 'pdf' | 'ocr'
}

export interface ScanPayload {
  parsed: ScanResponse
  /** Object URL for the local preview. The PARENT owns revoking this. */
  previewUrl: string | null
}

const emit = defineEmits<{
  scanned: [payload: ScanPayload]
  /** Emitted when the scan fails, so the parent can still open a blank form. */
  failed: [message: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const isScanning = ref(false)
const error = ref<string | null>(null)

/** Per-scan controller so a stale request can be cut off if the panel closes mid-scan. */
const controller = ref<AbortController | null>(null)

/** ofetch wraps a fetch-level abort as `FetchError` with `cause.name === 'AbortError'` — the
 * plain top-level `name` is NOT `'AbortError'`. Checked against the actual ofetch behaviour;
 * `signal.aborted` is kept as the primary, implementation-independent check. */
function isAbortError(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true
  const e = err as { name?: string, cause?: { name?: string } }
  return e?.name === 'AbortError' || e?.cause?.name === 'AbortError'
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = Array.from(e.dataTransfer?.files ?? [])[0]
  if (file) void scan(file)
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void scan(file)
  input.value = '' // allow re-selecting the same file
}

async function scan(file: File) {
  error.value = null
  isScanning.value = true

  // PDFs can't be shown in an <img>; only images get a preview.
  const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null

  const mine = new AbortController()
  controller.value = mine

  try {
    const body = new FormData()
    body.append('file', file)
    const parsed = await $fetch<ScanResponse>('/api/receipts/scan', { method: 'POST', body, signal: mine.signal })
    emit('scanned', { parsed, previewUrl })
  } catch (err) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    // A cancelled scan must stay silent: the parent already dismissed the panel, so
    // emitting `scanned` or `failed` now would just reopen/overwrite the form the
    // user closed instead of respecting the cancel.
    if (isAbortError(err, mine.signal)) return
    // Never dead-end: the parent opens a blank form so the slip can be typed in.
    const message = (err as { data?: { message?: string } })?.data?.message
      ?? 'Could not read that file. Enter it manually or try another photo.'
    error.value = message
    emit('failed', message)
  } finally {
    isScanning.value = false
    if (controller.value === mine) controller.value = null
  }
}

// The parent's Cancel button only unmounts the panel; without this the in-flight
// $fetch keeps running and its resolution would still emit into a closed panel.
onBeforeUnmount(() => {
  controller.value?.abort()
})

/** Lets the parent disable its own Cancel button while a scan is in flight. */
defineExpose({ isScanning: readonly(isScanning) })
</script>
