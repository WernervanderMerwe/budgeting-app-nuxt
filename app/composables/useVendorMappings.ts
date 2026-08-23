import type { VendorMapping, ReceiptCorrection } from '~/types/vendor-mappings'
import type { ExpenseCategory } from '~~/shared/utils/expense-categories'
import { extractErrorMessage } from '~/utils/api-error'

// Module-scope state is shared across every component instance, per the
// pattern in useYearlyBudget.ts - two sections on one page both read the
// same list without re-fetching or prop drilling.
const mappings = ref<VendorMapping[]>([])
const mappingsLoading = ref(false)
const mappingsError = ref<string | null>(null)

const corrections = ref<ReceiptCorrection[]>([])
const correctionsLoading = ref(false)
const correctionsError = ref<string | null>(null)

export function useVendorMappings() {
  async function fetchMappings() {
    mappingsLoading.value = true
    mappingsError.value = null
    try {
      const data = await $fetch<{ mappings: VendorMapping[] }>('/api/vendor-mappings')
      mappings.value = data.mappings
    } catch (e: unknown) {
      mappingsError.value = extractErrorMessage(e, 'Failed to load vendor mappings')
      console.error('Error fetching vendor mappings:', e)
    } finally {
      mappingsLoading.value = false
    }
  }

  // Server is the source of truth for timesSeen/lastSeenAt, so the returned
  // row replaces the local one wholesale rather than being merged in.
  async function updateMapping(id: number, expenseCategory: ExpenseCategory) {
    try {
      const updated = await $fetch<VendorMapping>(`/api/vendor-mappings/${id}`, {
        method: 'PATCH',
        body: { expenseCategory },
      })
      mappings.value = mappings.value.map(m => (m.id === id ? updated : m))
      return updated
    } catch (e: unknown) {
      throw new Error(extractErrorMessage(e, 'Failed to update vendor mapping'), { cause: e })
    }
  }

  async function deleteMapping(id: number) {
    try {
      await $fetch(`/api/vendor-mappings/${id}`, { method: 'DELETE' })
      mappings.value = mappings.value.filter(m => m.id !== id)
    } catch (e: unknown) {
      throw new Error(extractErrorMessage(e, 'Failed to delete vendor mapping'), { cause: e })
    }
  }

  async function fetchCorrections() {
    correctionsLoading.value = true
    correctionsError.value = null
    try {
      const data = await $fetch<{ corrections: ReceiptCorrection[] }>('/api/receipt-corrections')
      corrections.value = data.corrections
    } catch (e: unknown) {
      correctionsError.value = extractErrorMessage(e, 'Failed to load receipt corrections')
      console.error('Error fetching receipt corrections:', e)
    } finally {
      correctionsLoading.value = false
    }
  }

  // Optimistic: the whole point of this queue is watching it shrink as
  // corrections get resolved, so remove immediately and roll back on failure.
  async function resolveCorrection(id: number) {
    const previous = corrections.value
    corrections.value = corrections.value.filter(c => c.id !== id)
    try {
      await $fetch(`/api/receipt-corrections/${id}`, {
        method: 'PATCH',
        body: { resolved: true },
      })
    } catch (e: unknown) {
      corrections.value = previous
      throw new Error(extractErrorMessage(e, 'Failed to resolve correction'), { cause: e })
    }
  }

  return {
    // State
    mappings: readonly(mappings),
    mappingsLoading: readonly(mappingsLoading),
    mappingsError: readonly(mappingsError),
    corrections: readonly(corrections),
    correctionsLoading: readonly(correctionsLoading),
    correctionsError: readonly(correctionsError),

    // Actions
    fetchMappings,
    updateMapping,
    deleteMapping,
    fetchCorrections,
    resolveCorrection,
  }
}
