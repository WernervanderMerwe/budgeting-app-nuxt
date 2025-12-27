import type {
  YearlyBudget,
  YearlyBudgetWithRelations,
  CreateYearlyBudgetDTO,
  UpdateYearlyBudgetDTO,
} from '~/types/yearly'
import { getCurrentYear, getCurrentTimestamp } from '~/utils/date'
import { extractErrorMessage } from '~/utils/api-error'

// State is shared across components
const budgets = ref<YearlyBudget[]>([])
const currentBudget = ref<YearlyBudgetWithRelations | null>(null)
const selectedYear = ref<number>(getCurrentYear())
const loading = ref(false)
const error = ref<string | null>(null)

// Memoized readonly wrappers - ensures all composables share the same reactive reference
// This fixes reactivity issues where changes wouldn't propagate across composables
const readonlyBudgets = readonly(budgets)
const readonlyCurrentBudget = readonly(currentBudget)
const readonlySelectedYear = readonly(selectedYear)
const readonlyLoading = readonly(loading)
const readonlyError = readonly(error)

// Helper to get writable currentBudget for optimistic updates
export function getWritableYearlyBudget() {
  return currentBudget
}

export function useYearlyBudget() {
  const { showErrorToast } = useOptimisticUpdates()
  // Fetch all yearly budgets
  async function fetchBudgets() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<YearlyBudget[]>('/api/yearly')
      budgets.value = data
    } catch (e: unknown) {
      error.value = extractErrorMessage(e, 'Failed to fetch budgets')
      console.error('Error fetching budgets:', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch a budget by ID with all relations
  // Set silent=true to skip global loading state (for background refreshes after small updates)
  async function fetchBudgetById(id: number, silent = false) {
    if (!silent) {
      loading.value = true
    }
    error.value = null
    try {
      const data = await $fetch<YearlyBudgetWithRelations>(`/api/yearly/${id}`)
      currentBudget.value = data
      selectedYear.value = data.year
      return data
    } catch (e: unknown) {
      error.value = extractErrorMessage(e, 'Failed to fetch budget')
      console.error('Error fetching budget:', e)
      return null
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }

  // Refresh budget silently (for small updates like checkbox toggles)
  async function refreshBudgetSilently() {
    if (!currentBudget.value) return null
    return fetchBudgetById(currentBudget.value.id, true)
  }

  // Fetch budget by year
  async function fetchBudgetByYear(year: number) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<YearlyBudgetWithRelations>(`/api/yearly/by-year/${year}`)
      currentBudget.value = data
      selectedYear.value = year
      return data
    } catch (e: unknown) {
      // 404 is expected if no budget exists for the year
      const err = e as { statusCode?: number }
      if (err.statusCode === 404) {
        currentBudget.value = null
        return null
      }
      error.value = extractErrorMessage(e, 'Failed to fetch budget')
      console.error('Error fetching budget by year:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Create a new yearly budget
  async function createBudget(dto: CreateYearlyBudgetDTO) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<YearlyBudgetWithRelations>('/api/yearly', {
        method: 'POST',
        body: dto,
      })
      budgets.value.push(data)
      currentBudget.value = data
      selectedYear.value = data.year
      return data
    } catch (e: unknown) {
      error.value = extractErrorMessage(e, 'Failed to create budget')
      console.error('Error creating budget:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update a yearly budget (spendTarget, showWarnings) - optimistic
  async function updateBudget(id: number, dto: UpdateYearlyBudgetDTO) {
    error.value = null

    // Store previous state for rollback
    const previousBudgets = JSON.parse(JSON.stringify(budgets.value))
    const previousCurrentBudget = currentBudget.value ? JSON.parse(JSON.stringify(currentBudget.value)) : null

    // Apply optimistic update
    const index = budgets.value.findIndex(b => b.id === id)
    if (index !== -1) {
      budgets.value[index] = { ...budgets.value[index], ...dto, updatedAt: getCurrentTimestamp() }
    }
    if (currentBudget.value?.id === id) {
      currentBudget.value = { ...currentBudget.value, ...dto, updatedAt: getCurrentTimestamp() }
    }

    try {
      const data = await $fetch<YearlyBudget>(`/api/yearly/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Update with server response
      const idx = budgets.value.findIndex(b => b.id === id)
      if (idx !== -1) {
        budgets.value[idx] = { ...budgets.value[idx], ...data }
      }
      if (currentBudget.value?.id === id) {
        currentBudget.value = { ...currentBudget.value, ...data }
      }
      return data
    } catch (e: unknown) {
      // Rollback on error
      budgets.value = previousBudgets
      if (previousCurrentBudget) {
        currentBudget.value = previousCurrentBudget
      }
      const msg = extractErrorMessage(e, 'Failed to update budget')
      error.value = msg
      showErrorToast(msg)
      console.error('Error updating budget:', e)
      return null
    }
  }

  // Delete a yearly budget - optimistic
  async function deleteBudget(id: number) {
    error.value = null

    // Store previous state for rollback
    const previousBudgets = JSON.parse(JSON.stringify(budgets.value))
    const previousCurrentBudget = currentBudget.value ? JSON.parse(JSON.stringify(currentBudget.value)) : null

    // Apply optimistic update
    budgets.value = budgets.value.filter(b => b.id !== id)
    if (currentBudget.value?.id === id) {
      currentBudget.value = null
    }

    try {
      await $fetch(`/api/yearly/${id}`, { method: 'DELETE' })
      return true
    } catch (e: unknown) {
      // Rollback on error
      budgets.value = previousBudgets
      if (previousCurrentBudget) {
        currentBudget.value = previousCurrentBudget
      }
      const msg = extractErrorMessage(e, 'Failed to delete budget')
      error.value = msg
      showErrorToast(msg)
      console.error('Error deleting budget:', e)
      return false
    }
  }

  // Select a year and fetch its budget
  async function selectYear(year: number) {
    selectedYear.value = year
    return fetchBudgetByYear(year)
  }

  // Get or create budget for a year
  async function getOrCreateBudgetForYear(year: number) {
    const existing = await fetchBudgetByYear(year)
    if (existing) return existing
    return createBudget({ year })
  }

  // Computed: Check if current budget exists
  const hasBudget = computed(() => currentBudget.value !== null)

  // Computed: Available years from budgets
  const availableYears = computed(() => {
    return budgets.value.map(b => b.year).sort((a, b) => b - a)
  })

  return {
    // State (using memoized readonly wrappers for proper reactivity across composables)
    budgets: readonlyBudgets,
    currentBudget: readonlyCurrentBudget,
    selectedYear: readonlySelectedYear,
    loading: readonlyLoading,
    error: readonlyError,

    // Actions
    fetchBudgets,
    fetchBudgetById,
    fetchBudgetByYear,
    refreshBudgetSilently,
    createBudget,
    updateBudget,
    deleteBudget,
    selectYear,
    getOrCreateBudgetForYear,

    // Computed
    hasBudget,
    availableYears,
  }
}
