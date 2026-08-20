<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Scan receipt"
      @click.self="requestClose">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Scan Receipt
          </h2>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
            @click="requestClose">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5">
          <!-- Step 1: nothing picked yet -->
          <div v-if="!hasFile">
            <div
              class="border-2 border-dashed rounded-xl px-6 py-16 text-center cursor-pointer transition-colors"
              :class="dragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'"
              @click="fileInput?.click()"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop">
              <svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <p class="text-base font-medium text-gray-700 dark:text-gray-300">
                Drop a till slip or invoice here
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Photo or PDF &mdash; or click to choose
              </p>
            </div>
          </div>

          <!-- Step 2: slip on the left, fields on the right -->
          <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start">
            <!-- Slip -->
            <div class="min-w-0">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Scanned slip
                </span>
                <div v-if="previewUrl" class="flex items-center gap-1">
                  <button
                    type="button"
                    class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    :title="zoomed ? 'Fit the whole slip in view' : 'Zoom in to read the print'"
                    @click="zoomed = !zoomed">
                    {{ zoomed ? 'Fit' : 'Zoom' }}
                  </button>
                  <a
                    :href="previewUrl"
                    target="_blank"
                    rel="noopener"
                    class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Full size
                  </a>
                </div>
              </div>

              <div
                class="relative rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900/60"
                :class="zoomed ? 'overflow-auto max-h-[74vh]' : 'overflow-hidden'">
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="Scanned slip"
                  :class="zoomed
                    ? 'max-w-none w-[190%] h-auto'
                    : 'mx-auto w-full h-auto max-h-[74vh] object-contain'">

                <!-- PDFs cannot render in an <img> -->
                <div v-else class="px-6 py-16 text-center">
                  <svg class="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ fileName || 'PDF' }} &mdash; no preview, text read directly
                  </p>
                </div>

                <div v-if="isScanning" class="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex flex-col items-center justify-center">
                  <svg class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Reading slip&hellip;
                  </p>
                </div>
              </div>
            </div>

            <!-- Fields -->
            <form class="min-w-0 space-y-4" @submit.prevent="submit">
              <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
              <p v-if="notice" class="text-sm text-amber-700 dark:text-amber-400">
                {{ notice }}
              </p>

              <div>
                <label class="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </label>
                <input
                  v-model="form.description"
                  type="text"
                  placeholder="e.g., Woolworths, Pick n Pay"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  required
                  :disabled="isScanning || isSaving">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Amount
                  </label>
                  <CurrencyInput
                    v-model="form.amount"
                    placeholder="e.g., 250.00"
                    required
                    :disabled="isScanning || isSaving"/>
                </div>
                <div>
                  <label class="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Date
                  </label>
                  <DatePicker
                    v-model="form.date"
                    placeholder="Select date"
                    required
                    :disabled="isScanning || isSaving"/>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Category
                </label>
                <select
                  v-model.number="selectedCategoryId"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  :disabled="isScanning || isSaving">
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
                <p v-if="categoryWarning" class="mt-1.5 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <span aria-hidden="true">&#9888;</span>
                  <span>{{ categoryWarning }}</span>
                </p>
              </div>

              <div class="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isSaving"
                  @click="requestClose">
                  {{ isScanning ? 'Stop' : 'Cancel' }}
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  :disabled="isScanning || isSaving">
                  <svg v-if="isSaving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>{{ isSaving ? 'Adding...' : 'Add' }}</span>
                </button>
              </div>
            </form>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/*,application/pdf"
            class="hidden"
            @change="onFileSelect">
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * The whole scan flow: pick a slip, watch it being read, check the numbers
 * against the image, save.
 *
 * It is a full-width modal rather than a panel inside the category card for one
 * concrete reason: the card is a narrow grid column, so the slip rendered at
 * roughly 100px wide — far too small to read a total off, which defeats the
 * entire point of showing the image. Here it gets most of a 6xl dialog, plus a
 * zoom toggle for faded thermal print.
 */
import type { ParsedReceipt } from '~~/shared/utils/receipt-types'
import { isCategoryMismatch } from '~~/shared/utils/receipt-merchants'
import { centsToRands } from '~/utils/currency'
import { formatDate, getCurrentTimestamp } from '~/utils/date'

interface ScanResponse extends ParsedReceipt {
  /** Whether the text came from a PDF text layer or from OCR. */
  source: 'pdf' | 'ocr'
}

interface CategoryOption { id: number, name: string }

const props = defineProps<{
  open: boolean
  /** The card the scan was launched from — the default category. */
  categoryId: number
  categories: readonly CategoryOption[]
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { categoryId: number, description: string, amount: number, date: string }]
}>()

/** Upload + server-side scan ceiling; the server's own lock timeout is 30s. */
const SCAN_TIMEOUT_MS = 60_000

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const isScanning = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const fileName = ref<string | null>(null)
const hasFile = ref(false)
const zoomed = ref(false)
const scannedKind = ref<string | null>(null)
const selectedCategoryId = ref<number>(props.categoryId)

const form = ref({
  description: '',
  amount: 0,
  date: formatDate(getCurrentTimestamp(), 'iso'),
})

/** Per-scan controller so a stale request is cut off if the modal closes mid-scan. */
const controller = ref<AbortController | null>(null)

const selectedCategoryName = computed(() =>
  props.categories.find(c => c.id === selectedCategoryId.value)?.name ?? '',
)

/**
 * Only warns when the merchant kind AND the category name are both known and
 * disagree — an unrecognised shop or an unclassifiable category stays silent.
 * Never blocks saving: buying milk at a Shell garage is legitimate.
 */
const categoryWarning = computed(() => {
  if (!scannedKind.value || !selectedCategoryName.value) return null
  if (!isCategoryMismatch(scannedKind.value as never, selectedCategoryName.value)) return null
  return `This looks like a ${scannedKind.value.replace('-', ' ')} slip.`
})

/**
 * ofetch wraps a fetch-level abort as `FetchError` with `cause.name === 'AbortError'` — the
 * plain top-level `name` is NOT `'AbortError'`. `signal.aborted` is kept as the primary,
 * implementation-independent check.
 */
function isAbortError(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true
  const e = err as { name?: string, cause?: { name?: string } }
  return e?.name === 'AbortError' || e?.cause?.name === 'AbortError'
}

function releasePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

function reset() {
  controller.value?.abort()
  controller.value = null
  releasePreview()
  dragging.value = false
  isScanning.value = false
  isSaving.value = false
  error.value = null
  notice.value = null
  fileName.value = null
  hasFile.value = false
  zoomed.value = false
  scannedKind.value = null
  selectedCategoryId.value = props.categoryId
  form.value = {
    description: '',
    amount: 0,
    date: formatDate(getCurrentTimestamp(), 'iso'),
  }
}

/**
 * Closing mid-scan must work.
 *
 * The overlay covers the whole page, so refusing to close while `isScanning`
 * left the user trapped whenever a scan did not settle — a dropped mobile
 * connection never rejects on its own. Aborting is safe: `scan()`'s catch
 * returns silently on abort and its `finally` is guarded by
 * `controller.value === mine`, so a superseded scan is a no-op.
 *
 * Saving is different — that request is already in flight against the DB, so
 * it is still allowed to finish.
 */
function requestClose() {
  if (isSaving.value) return
  controller.value?.abort()
  emit('close')
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = Array.from(e.dataTransfer?.files ?? [])[0]
  if (!file) {
    // Dragging selected text, a URL or a folder yields no file.
    error.value = 'That was not a file. Drop a photo or a PDF.'
    return
  }
  void scan(file)
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void scan(file)
  input.value = '' // allow re-selecting the same file
}

async function scan(file: File) {
  error.value = null
  notice.value = null
  fileName.value = file.name
  hasFile.value = true

  // Show the slip straight away, so it is on screen WHILE the OCR runs rather
  // than appearing only once it finishes. PDFs cannot render in an <img>.
  releasePreview()
  previewUrl.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : null

  isScanning.value = true
  const mine = new AbortController()
  controller.value = mine

  try {
    const body = new FormData()
    body.append('file', file)
    const parsed = await $fetch<ScanResponse>('/api/receipts/scan', {
      method: 'POST',
      body,
      signal: mine.signal,
      // The server's own scan-lock timeout is 30s; allow for the upload on top
      // so a stalled connection surfaces as an error instead of hanging.
      timeout: SCAN_TIMEOUT_MS,
    })
    // The modal may have been closed and reopened while this was in flight.
    if (controller.value !== mine) return
    applyResult(parsed)
  } catch (err) {
    // A cancelled scan must stay silent: the modal was already dismissed.
    if (isAbortError(err, mine.signal)) return
    const message = (err as { data?: { message?: string } })?.data?.message
    // A failed scan must never dead-end — the fields stay open to be typed in.
    error.value = message || 'Failed to scan the receipt. Enter the details by hand.'
    scannedKind.value = null
    selectedCategoryId.value = props.categoryId
  } finally {
    if (controller.value === mine) {
      isScanning.value = false
      controller.value = null
    }
  }
}

function applyResult(parsed: ScanResponse) {
  scannedKind.value = parsed.merchantKind
  selectedCategoryId.value = props.categoryId

  form.value = {
    description: parsed.merchant ?? '',
    // A partial scan still saves typing: leave what we could not read blank
    // rather than guessing a number.
    amount: parsed.amountCents !== null ? centsToRands(parsed.amountCents) : 0,
    date: parsed.transactionDate
      ? formatDate(parsed.transactionDate, 'iso')
      : formatDate(getCurrentTimestamp(), 'iso'),
  }

  const missing: string[] = []
  if (!parsed.merchant) missing.push('shop name')
  if (parsed.amountCents === null) missing.push('total')
  notice.value = missing.length
    ? `Could not read the ${missing.join(' or ')} — please fill it in.`
    : parsed.confidence < 0.9
      ? 'Low confidence on the total — double-check it against the slip.'
      : null
}

function submit() {
  if (isScanning.value || isSaving.value) return
  isSaving.value = true
  emit('save', {
    categoryId: selectedCategoryId.value,
    description: form.value.description,
    amount: form.value.amount,
    date: form.value.date,
  })
}

// Reset on every open so a previous slip never bleeds into the next scan, and
// release the object URL on close so the blob is not retained.
watch(() => props.open, (open) => {
  if (open) reset()
  else {
    controller.value?.abort()
    releasePreview()
  }
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) requestClose()
}

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  controller.value?.abort()
  releasePreview()
})
</script>
