// Composable for managing months
import type {
  Month,
  MonthWithRelations,
  CreateMonthDTO,
  UpdateMonthDTO,
  MonthListItem
} from '~/types/budget'

export const useMonths = () => {
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
      // Sort by year descending, then by month descending
      if (a.year !== b.year) {
        return b.year - a.year
      }
      return b.month - a.month
    })
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
    } catch (error: any) {
      monthsError.value = error.message || 'Failed to fetch months'
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
    } catch (error: any) {
      monthsError.value = error.message || 'Failed to fetch month'
      console.error('Error fetching month:', error)
      throw error
    }
  }

  /**
   * Create a new month
   */
  const createMonth = async (monthData: CreateMonthDTO): Promise<Month> => {
    monthsError.value = null

    try {
      const newMonth = await $fetch<Month>('/api/months', {
        method: 'POST',
        body: monthData
      })

      months.value.push(newMonth)
      return newMonth
    } catch (error: any) {
      monthsError.value = error.message || 'Failed to create month'
      console.error('Error creating month:', error)
      throw error
    }
  }

  /**
   * Update an existing month
   */
  const updateMonth = async (id: number, monthData: UpdateMonthDTO): Promise<Month> => {
    monthsError.value = null

    try {
      const updatedMonth = await $fetch<Month>(`/api/months/${id}`, {
        method: 'PATCH',
        body: monthData
      })

      // Update in the list
      const index = months.value.findIndex(m => m.id === id)
      if (index !== -1) {
        months.value[index] = updatedMonth
      }

      // Update current month if it's the same
      if (currentMonth.value && currentMonth.value.id === id) {
        currentMonth.value = {
          ...currentMonth.value,
          ...updatedMonth
        }
      }

      return updatedMonth
    } catch (error: any) {
      monthsError.value = error.message || 'Failed to update month'
      console.error('Error updating month:', error)
      throw error
    }
  }

  /**
   * Delete a month
   */
  const deleteMonth = async (id: number): Promise<void> => {
    monthsError.value = null

    try {
      await $fetch(`/api/months/${id}`, {
        method: 'DELETE'
      })

      // Remove from list
      months.value = months.value.filter(m => m.id !== id)

      // Clear current month if it was deleted
      if (currentMonth.value && currentMonth.value.id === id) {
        currentMonth.value = null
        selectedMonthId.value = null
      }
    } catch (error: any) {
      monthsError.value = error.message || 'Failed to delete month'
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
