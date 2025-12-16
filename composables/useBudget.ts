// Composable for managing budget items (fixed payments, categories, transactions)
import type {
  FixedPayment,
  BudgetCategory,
  Transaction,
  CreateFixedPaymentDTO,
  UpdateFixedPaymentDTO,
  CreateBudgetCategoryDTO,
  UpdateBudgetCategoryDTO,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  MonthSummary
} from '~/types/budget'
import { useMonths } from './useMonths'

export const useBudget = () => {
  // State
  const summary = useState<MonthSummary | null>('budgetSummary', () => null)
  const isLoadingSummary = useState<boolean>('isLoadingSummary', () => false)
  const budgetError = useState<string | null>('budgetError', () => null)

  // Get access to months composable
  const { currentMonth, refreshCurrentMonth } = useMonths()

  // ============================================================================
  // Fixed Payments
  // ============================================================================

  /**
   * Create a new fixed payment
   */
  const createFixedPayment = async (data: CreateFixedPaymentDTO): Promise<FixedPayment> => {
    budgetError.value = null

    try {
      const newPayment = await $fetch<FixedPayment>('/api/fixed-payments', {
        method: 'POST',
        body: data
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()

      return newPayment
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to create fixed payment'
      console.error('Error creating fixed payment:', error)
      throw error
    }
  }

  /**
   * Update a fixed payment
   */
  const updateFixedPayment = async (id: number, data: UpdateFixedPaymentDTO): Promise<FixedPayment> => {
    budgetError.value = null

    try {
      const updatedPayment = await $fetch<FixedPayment>(`/api/fixed-payments/${id}`, {
        method: 'PATCH',
        body: data
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()

      return updatedPayment
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to update fixed payment'
      console.error('Error updating fixed payment:', error)
      throw error
    }
  }

  /**
   * Delete a fixed payment
   */
  const deleteFixedPayment = async (id: number): Promise<void> => {
    budgetError.value = null

    try {
      await $fetch(`/api/fixed-payments/${id}`, {
        method: 'DELETE'
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to delete fixed payment'
      console.error('Error deleting fixed payment:', error)
      throw error
    }
  }

  // ============================================================================
  // Budget Categories
  // ============================================================================

  /**
   * Create a new budget category
   */
  const createCategory = async (data: CreateBudgetCategoryDTO): Promise<BudgetCategory> => {
    budgetError.value = null

    try {
      const newCategory = await $fetch<BudgetCategory>('/api/categories', {
        method: 'POST',
        body: data
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()

      return newCategory
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to create category'
      console.error('Error creating category:', error)
      throw error
    }
  }

  /**
   * Update a budget category
   */
  const updateCategory = async (id: number, data: UpdateBudgetCategoryDTO): Promise<BudgetCategory> => {
    budgetError.value = null

    try {
      const updatedCategory = await $fetch<BudgetCategory>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: data
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()

      return updatedCategory
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to update category'
      console.error('Error updating category:', error)
      throw error
    }
  }

  /**
   * Delete a budget category
   */
  const deleteCategory = async (id: number): Promise<void> => {
    budgetError.value = null

    try {
      await $fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to delete category'
      console.error('Error deleting category:', error)
      throw error
    }
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  /**
   * Create a new transaction
   */
  const createTransaction = async (data: CreateTransactionDTO): Promise<Transaction> => {
    budgetError.value = null

    try {
      const newTransaction = await $fetch<Transaction>('/api/transactions', {
        method: 'POST',
        body: data
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()

      return newTransaction
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to create transaction'
      console.error('Error creating transaction:', error)
      throw error
    }
  }

  /**
   * Update a transaction
   */
  const updateTransaction = async (id: number, data: UpdateTransactionDTO): Promise<Transaction> => {
    budgetError.value = null

    try {
      const updatedTransaction = await $fetch<Transaction>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: data
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()

      return updatedTransaction
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to update transaction'
      console.error('Error updating transaction:', error)
      throw error
    }
  }

  /**
   * Delete a transaction
   */
  const deleteTransaction = async (id: number): Promise<void> => {
    budgetError.value = null

    try {
      await $fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      })

      // Refresh current month and summary to get updated data
      await refreshCurrentMonth()
      await refreshSummary()
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to delete transaction'
      console.error('Error deleting transaction:', error)
      throw error
    }
  }

  // ============================================================================
  // Summary & Calculations
  // ============================================================================

  /**
   * Fetch summary for a month
   */
  const fetchSummary = async (monthId: number): Promise<MonthSummary> => {
    isLoadingSummary.value = true
    budgetError.value = null

    try {
      const data = await $fetch<MonthSummary>(`/api/months/${monthId}/summary`)
      summary.value = data
      return data
    } catch (error: any) {
      budgetError.value = error.message || 'Failed to fetch summary'
      console.error('Error fetching summary:', error)
      throw error
    } finally {
      isLoadingSummary.value = false
    }
  }

  /**
   * Refresh summary for the current month
   */
  const refreshSummary = async (): Promise<void> => {
    if (currentMonth.value) {
      await fetchSummary(currentMonth.value.id)
    }
  }

  /**
   * Clear summary data
   */
  const clearSummary = (): void => {
    summary.value = null
  }

  /**
   * Clear all errors
   */
  const clearError = (): void => {
    budgetError.value = null
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    summary: readonly(summary),
    isLoadingSummary: readonly(isLoadingSummary),
    budgetError: readonly(budgetError),

    // Fixed Payments
    createFixedPayment,
    updateFixedPayment,
    deleteFixedPayment,

    // Categories
    createCategory,
    updateCategory,
    deleteCategory,

    // Transactions
    createTransaction,
    updateTransaction,
    deleteTransaction,

    // Summary
    fetchSummary,
    refreshSummary,
    clearSummary,

    // Utility
    clearError
  }
}
