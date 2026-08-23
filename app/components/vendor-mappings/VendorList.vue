<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Vendors</h2>

    <!-- Loading State -->
    <LoadingSpinner
      v-if="mappingsLoading && mappings.length === 0"
      size="md"
      text="Loading vendor mappings..."
      container-class="py-10"/>

    <!-- Error State -->
    <div v-else-if="mappingsError">
      <ErrorAlert :message="mappingsError" title="Couldn't load vendor mappings" />
      <button
        class="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        @click="fetchMappings">
        Retry
      </button>
    </div>

    <template v-else-if="!mappingsLoading || mappings.length > 0">
      <!-- Learned mappings -->
      <div v-if="learnedGroups.length === 0" class="text-center py-10">
        <svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">No vendors taught yet</p>
        <p class="text-gray-500 dark:text-gray-500 text-xs mt-1">
          Edit a receipt's category during a scan and the app remembers it next time.
        </p>
      </div>

      <ul v-else class="space-y-4">
        <li v-for="group in learnedGroups" :key="group.vendor">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{{ group.vendor }}</h3>
          <ul class="space-y-1">
            <li
              v-for="row in group.rows"
              :key="row.id"
              class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <!-- Display Mode -->
              <template v-if="editingId !== row.id">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ EXPENSE_CATEGORY_LABELS[row.expenseCategory] }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    &times;{{ row.timesSeen }}
                  </span>
                  <span
                    class="text-xs text-gray-400 dark:text-gray-500"
                    :title="formatDate(row.lastSeenAt, 'long')">
                    {{ getRelativeTime(row.lastSeenAt) }}
                  </span>
                </div>
                <div class="flex space-x-1">
                  <button
                    class="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    title="Edit"
                    @click="startEditing(row)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    class="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    title="Delete"
                    @click="handleDelete(row)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </template>

              <!-- Edit Mode -->
              <form
                v-else
                class="flex-1 flex items-center gap-2"
                @submit.prevent="handleUpdate(row)">
                <select
                  v-model="editedCategory"
                  class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving">
                  <option v-for="cat in EXPENSE_CATEGORIES" :key="cat" :value="cat">
                    {{ EXPENSE_CATEGORY_LABELS[cat] }}
                  </option>
                </select>
                <button
                  type="submit"
                  :disabled="isSaving"
                  class="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1 disabled:opacity-50"
                  title="Save">
                  <svg v-if="isSaving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  :disabled="isSaving"
                  class="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 disabled:opacity-50"
                  title="Cancel"
                  @click="cancelEditing">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
            </li>
          </ul>
          <p v-if="editError && editingVendor === group.vendor" class="text-xs text-red-600 dark:text-red-400 mt-1">
            {{ editError }}
          </p>
        </li>
      </ul>

      <!-- Shipped defaults (collapsible) -->
      <div v-if="defaultGroups.length > 0" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          class="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          @click="isExpanded = !isExpanded">
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-90': isExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Show {{ defaultRowCount }} shipped defaults
        </button>

        <ul v-show="isExpanded" class="mt-3 space-y-3">
          <li v-for="group in defaultGroups" :key="group.vendor">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">{{ group.vendor }}</h3>
            <ul class="space-y-1">
              <li
                v-for="row in group.rows"
                :key="row.id"
                class="flex items-center gap-2 flex-wrap p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg opacity-75">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ EXPENSE_CATEGORY_LABELS[row.expenseCategory] }}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  &times;{{ row.timesSeen }}
                </span>
                <span
                  class="text-xs text-gray-400 dark:text-gray-500"
                  :title="formatDate(row.lastSeenAt, 'long')">
                  {{ getRelativeTime(row.lastSeenAt) }}
                </span>
                <span class="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  Default
                </span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { VendorMapping } from '~/types/vendor-mappings'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '~~/shared/utils/expense-categories'
import { getRelativeTime, formatDate } from '~/utils/date'

const {
  mappings,
  mappingsLoading,
  mappingsError,
  fetchMappings,
  updateMapping,
  deleteMapping,
} = useVendorMappings()
const { openDialog } = useConfirmDialog()

const isExpanded = ref(false)
const editingId = ref<number | null>(null)
const editingVendor = ref<string | null>(null)
const editedCategory = ref<ExpenseCategory>('OTHER')
const isSaving = ref(false)
const editError = ref<string | null>(null)

interface VendorGroup {
  vendor: string
  rows: VendorMapping[]
}

// Groups rows by vendor, sorts rows within a vendor by timesSeen desc, and
// sorts the vendor groups by their most recent lastSeenAt - this is
// page-specific view shaping, not shared business logic.
function groupByVendor(rows: readonly VendorMapping[]): VendorGroup[] {
  const byVendor = new Map<string, VendorMapping[]>()
  for (const row of rows) {
    const existing = byVendor.get(row.vendor)
    if (existing) {
      existing.push(row)
    } else {
      byVendor.set(row.vendor, [row])
    }
  }

  const groups: VendorGroup[] = Array.from(byVendor.entries()).map(([vendor, groupRows]) => ({
    vendor,
    rows: [...groupRows].sort((a, b) => b.timesSeen - a.timesSeen),
  }))

  groups.sort((a, b) => {
    const aMax = Math.max(...a.rows.map(r => r.lastSeenAt))
    const bMax = Math.max(...b.rows.map(r => r.lastSeenAt))
    return bMax - aMax
  })

  return groups
}

const learnedGroups = computed(() => groupByVendor(mappings.value.filter(m => !m.isDefault)))
const defaultGroups = computed(() => groupByVendor(mappings.value.filter(m => m.isDefault)))
const defaultRowCount = computed(() => mappings.value.filter(m => m.isDefault).length)

function startEditing(row: VendorMapping) {
  editingId.value = row.id
  editingVendor.value = row.vendor
  editedCategory.value = row.expenseCategory
  editError.value = null
}

function cancelEditing() {
  editingId.value = null
  editingVendor.value = null
  editError.value = null
}

async function handleUpdate(row: VendorMapping) {
  if (isSaving.value) return
  isSaving.value = true
  editError.value = null
  try {
    await updateMapping(row.id, editedCategory.value)
    cancelEditing()
  } catch (error) {
    // Keep the edit UI open on failure so the in-progress change isn't lost.
    editError.value = error instanceof Error ? error.message : 'Failed to update vendor mapping'
    console.error('Failed to update vendor mapping:', error)
  } finally {
    isSaving.value = false
  }
}

function handleDelete(row: VendorMapping) {
  const categoryLabel = EXPENSE_CATEGORY_LABELS[row.expenseCategory]
  openDialog({
    title: 'Delete Vendor Mapping',
    message: `Delete the "${row.vendor} → ${categoryLabel}" mapping? This can't be undone.`,
    confirmText: 'Delete',
    confirmColor: 'red',
    onConfirm: async () => {
      try {
        await deleteMapping(row.id)
      } catch (error) {
        console.error('Failed to delete vendor mapping:', error)
      }
    },
  })
}

onMounted(() => {
  fetchMappings()
})
</script>
