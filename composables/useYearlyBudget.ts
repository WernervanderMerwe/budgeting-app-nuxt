import type {
  YearlyBudget,
  YearlyBudgetWithRelations,
  CreateYearlyBudgetDTO,
  UpdateYearlyBudgetDTO,
} from '~/types/yearly'
import { getCurrentYear } from '~/utils/date'

// State is shared across components
const budgets = ref<YearlyBudget[]>([])
const currentBudget = ref<YearlyBudgetWithRelations | null>(null)
const selectedYear = ref<number>(getCurrentYear())
const loading = ref(false)
const error = ref<string | null>(null)

export function useYearlyBudget() {
  // Fetch all yearly budgets
  async function fetchBudgets() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<YearlyBudget[]>('/api/yearly')
      budgets.value = data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch budgets'
      console.error('Error fetching budgets:', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch a budget by ID with all relations
  async function fetchBudgetById(id: number) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<YearlyBudgetWithRelations>(`/api/yearly/${id}`)
      currentBudget.value = data
      selectedYear.value = data.year
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch budget'
      console.error('Error fetching budget:', e)
      return null
    } finally {
      loading.value = false
    }
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
    } catch (e: any) {
      // 404 is expected if no budget exists for the year
      if (e.statusCode === 404) {
        currentBudget.value = null
        return null
      }
      error.value = e.message || 'Failed to fetch budget'
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
    } catch (e: any) {
      error.value = e.message || 'Failed to create budget'
      console.error('Error creating budget:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update a yearly budget (spendTarget, showWarnings)
  async function updateBudget(id: number, dto: UpdateYearlyBudgetDTO) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<YearlyBudget>(`/api/yearly/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Update in budgets list
      const index = budgets.value.findIndex(b => b.id === id)
      if (index !== -1) {
        budgets.value[index] = { ...budgets.value[index], ...data }
      }
      // Update current budget if it's the same
      if (currentBudget.value?.id === id) {
        currentBudget.value = { ...currentBudget.value, ...data }
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Failed to update budget'
      console.error('Error updating budget:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete a yearly budget
  async function deleteBudget(id: number) {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/yearly/${id}`, { method: 'DELETE' })
      budgets.value = budgets.value.filter(b => b.id !== id)
      if (currentBudget.value?.id === id) {
        currentBudget.value = null
      }
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete budget'
      console.error('Error deleting budget:', e)
      return false
    } finally {
      loading.value = false
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
    // State
    budgets: readonly(budgets),
    currentBudget: readonly(currentBudget),
    selectedYear: readonly(selectedYear),
    loading: readonly(loading),
    error: readonly(error),

    // Actions
    fetchBudgets,
    fetchBudgetById,
    fetchBudgetByYear,
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
