// Composable for managing months
import type {
  Month,
  MonthWithRelations,
  CreateMonthDTO,
  UpdateMonthDTO,
  MonthListItem
} from '~/types/budget'
import { generateTempId } from './useOptimisticUpdates'
import { getCurrentTimestamp } from '~/utils/date'
import { randsToCents } from '~/utils/currency'
import { extractErrorMessage } from '~/utils/api-error'

export const useMonths = () => {
  const { showErrorToast } = useOptimisticUpdates()
  // State
  const months = useState<Month[]>('months', () => [])
  const currentMonth = useState<MonthWithRelations | null>('currentMonth', () => null)
  const selectedMonthId = useState<number | null>('selectedMonthId', () => null)
  const isLoadingMonths = useState<boolean>('isLoadingMonths', () => false)
  const monthsError = useState<string | null>('monthsError', () => null)

  // Computed
  const monthsList = computed<MonthListItem[]>(() => {
    return months.value.map(month => ({
      id: month.id,
      name: month.name,
      year: month.year,
      month: month.month,
      displayName: month.name
    }))
  })

  const sortedMonths = computed<MonthListItem[]>(() => {
    return [...monthsList.value].sort((a, b) => {
      // Sort by year ascending, then by month ascending
      if (a.year !== b.year) {
        return a.year - b.year
      }
      return a.month - b.month
    })
  })

  // Group months by year for display
  const monthsByYear = computed<Record<number, MonthListItem[]>>(() => {
    const grouped: Record<number, MonthListItem[]> = {}
    sortedMonths.value.forEach(month => {
      if (!grouped[month.year]) {
        grouped[month.year] = []
      }
      grouped[month.year].push(month)
    })
    return grouped
  })

  // Get sorted years (ascending)
  const years = computed<number[]>(() => {
    return Object.keys(monthsByYear.value)
      .map(Number)
      .sort((a, b) => a - b)
  })

  const hasMonths = computed(() => months.value.length > 0)

  // ============================================================================
  // API Functions
  // ============================================================================

  /**
   * Fetch all months
   */
  const fetchMonths = async (): Promise<void> => {
    isLoadingMonths.value = true
    monthsError.value = null

    try {
      const data = await $fetch<Month[]>('/api/months')
      months.value = data
    } catch (error: unknown) {
      monthsError.value = extractErrorMessage(error, 'Failed to fetch months')
      console.error('Error fetching months:', error)
      throw error
    } finally {
      isLoadingMonths.value = false
    }
  }

  /**
   * Fetch a single month with all related data
   */
  const fetchMonth = async (id: number): Promise<MonthWithRelations> => {
    monthsError.value = null

    try {
      const data = await $fetch<MonthWithRelations>(`/api/months/${id}`)
      currentMonth.value = data
      selectedMonthId.value = id
      return data
    } catch (error: unknown) {
      monthsError.value = extractErrorMessage(error, 'Failed to fetch month')
      console.error('Error fetching month:', error)
      throw error
    }
  }

  /**
   * Create a new month (optimistic)
   */
  const createMonth = async (monthData: CreateMonthDTO): Promise<Month> => {
    monthsError.value = null

    // Store previous state for rollback
    const previousMonths = JSON.parse(JSON.stringify(months.value))

    // Generate temp ID and create optimistic month
    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    const optimisticMonth: Month = {
      id: tempId,
      name: monthData.name,
      year: monthData.year,
      month: monthData.month,
      income: 0,
      createdAt: now,
    }

    // Apply optimistic update
    months.value = [...months.value, optimisticMonth]

    try {
      const newMonth = await $fetch<Month>('/api/months', {
        method: 'POST',
        body: monthData
      })

      // Replace temp with real month
      months.value = months.value.map(m => m.id === tempId ? newMonth : m)
      return newMonth
    } catch (error: unknown) {
      // Rollback on error
      months.value = previousMonths
      const msg = extractErrorMessage(error, 'Failed to create month')
      monthsError.value = msg
      showErrorToast(msg)
      console.error('Error creating month:', error)
      throw error
    }
  }

  /**
   * Update an existing month (optimistic)
   */
  const updateMonth = async (id: number, monthData: UpdateMonthDTO): Promise<Month> => {
    monthsError.value = null

    // Store previous state for rollback
    const previousMonths = JSON.parse(JSON.stringify(months.value))
    const previousCurrentMonth = currentMonth.value ? JSON.parse(JSON.stringify(currentMonth.value)) : null

    // Convert income to cents for optimistic update (API receives Rands, but state stores cents)
    const optimisticData = monthData.income !== undefined
      ? { ...monthData, income: randsToCents(monthData.income) }
      : monthData

    // Apply optimistic update
    const index = months.value.findIndex(m => m.id === id)
    if (index !== -1) {
      months.value[index] = { ...months.value[index], ...optimisticData, updatedAt: getCurrentTimestamp() }
    }
    if (currentMonth.value && currentMonth.value.id === id) {
      currentMonth.value = { ...currentMonth.value, ...optimisticData, updatedAt: getCurrentTimestamp() }
    }

    try {
      const updatedMonth = await $fetch<Month>(`/api/months/${id}`, {
        method: 'PATCH',
        body: monthData
      })

      // Update with server response
      const idx = months.value.findIndex(m => m.id === id)
      if (idx !== -1) {
        months.value[idx] = updatedMonth
      }
      if (currentMonth.value && currentMonth.value.id === id) {
        currentMonth.value = { ...currentMonth.value, ...updatedMonth }
      }

      return updatedMonth
    } catch (error: unknown) {
      // Rollback on error
      months.value = previousMonths
      if (previousCurrentMonth) {
        currentMonth.value = previousCurrentMonth
      }
      const msg = extractErrorMessage(error, 'Failed to update month')
      monthsError.value = msg
      showErrorToast(msg)
      console.error('Error updating month:', error)
      throw error
    }
  }

  /**
   * Delete a month (optimistic)
   */
  const deleteMonth = async (id: number): Promise<void> => {
    monthsError.value = null

    // Store previous state for rollback
    const previousMonths = JSON.parse(JSON.stringify(months.value))
    const previousCurrentMonth = currentMonth.value ? JSON.parse(JSON.stringify(currentMonth.value)) : null
    const previousSelectedMonthId = selectedMonthId.value

    // Apply optimistic update
    months.value = months.value.filter(m => m.id !== id)
    if (currentMonth.value && currentMonth.value.id === id) {
      currentMonth.value = null
      selectedMonthId.value = null
    }

    try {
      await $fetch(`/api/months/${id}`, {
        method: 'DELETE'
      })
    } catch (error: unknown) {
      // Rollback on error
      months.value = previousMonths
      if (previousCurrentMonth) {
        currentMonth.value = previousCurrentMonth
        selectedMonthId.value = previousSelectedMonthId
      }
      const msg = extractErrorMessage(error, 'Failed to delete month')
      monthsError.value = msg
      showErrorToast(msg)
      console.error('Error deleting month:', error)
      throw error
    }
  }

  /**
   * Select a month (loads it with full data)
   */
  const selectMonth = async (id: number): Promise<void> => {
    if (selectedMonthId.value === id && currentMonth.value) {
      // Already selected, no need to fetch again
      return
    }

    await fetchMonth(id)
  }

  /**
   * Refresh the current month data
   */
  const refreshCurrentMonth = async (): Promise<void> => {
    if (selectedMonthId.value) {
      await fetchMonth(selectedMonthId.value)
    }
  }

  /**
   * Clear the current month selection
   */
  const clearCurrentMonth = (): void => {
    currentMonth.value = null
    selectedMonthId.value = null
  }

  /**
   * Clear all errors
   */
  const clearError = (): void => {
    monthsError.value = null
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    months: readonly(months),
    currentMonth: readonly(currentMonth),
    selectedMonthId: readonly(selectedMonthId),
    isLoadingMonths: readonly(isLoadingMonths),
    monthsError: readonly(monthsError),

    // Computed
    monthsList,
    sortedMonths,
    monthsByYear,
    years,
    hasMonths,

    // Methods
    fetchMonths,
    fetchMonth,
    createMonth,
    updateMonth,
    deleteMonth,
    selectMonth,
    refreshCurrentMonth,
    clearCurrentMonth,
    clearError
  }
}
