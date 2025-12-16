// Composable for managing budget items with optimistic updates
import type { Ref } from 'vue'
import type {
  FixedPayment,
  BudgetCategory,
  Transaction,
  BudgetCategoryWithTransactions,
  MonthWithRelations,
  CreateFixedPaymentDTO,
  UpdateFixedPaymentDTO,
  CreateBudgetCategoryDTO,
  UpdateBudgetCategoryDTO,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  MonthSummary,
  CategorySummary
} from '~/types/budget'
import { useMonths } from './useMonths'
import { generateTempId } from './useOptimisticUpdates'
import { getCurrentTimestamp } from '~/utils/date'
import { randsToCents } from '~/utils/currency'

export const useBudget = () => {
  // State
  const summary = useState<MonthSummary | null>('budgetSummary', () => null)
  const isLoadingSummary = useState<boolean>('isLoadingSummary', () => false)
  const budgetError = useState<string | null>('budgetError', () => null)

  // Get access to months composable and optimistic helpers
  const { currentMonth, refreshCurrentMonth } = useMonths()
  const { showErrorToast, addPendingOperation, removePendingOperation } = useOptimisticUpdates()

  // ============================================================================
  // Helper: Get writable reference to currentMonth state
  // ============================================================================

  const getCurrentMonthState = (): Ref<MonthWithRelations | null> => {
    return useState<MonthWithRelations | null>('currentMonth')
  }

  // ============================================================================
  // Helper: Recalculate summary locally
  // ============================================================================

  const recalculateSummary = (): MonthSummary | null => {
    const month = currentMonth.value
    if (!month) return null

    const totalFixedPayments = month.fixedPayments.reduce(
      (sum, fp) => sum + fp.amount, 0
    )

    const categories: CategorySummary[] = month.categories.map(cat => {
      const spent = cat.transactions.reduce((sum, txn) => sum + txn.amount, 0)
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        allocated: cat.allocatedAmount,
        spent,
        remaining: Math.max(0, cat.allocatedAmount - spent)
      }
    })

    const totalBudgeted = month.categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount, 0
    )

    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0)

    return {
      monthId: month.id,
      monthName: month.name,
      income: month.income,
      totalFixedPayments,
      availableAfterFixed: month.income - totalFixedPayments,
      totalBudgeted,
      availableAfterBudgets: month.income - totalFixedPayments - totalBudgeted,
      totalSpent,
      totalRemaining: month.income - totalFixedPayments - totalSpent,
      categories
    }
  }

  // ============================================================================
  // Fixed Payments (Optimistic)
  // ============================================================================

  const createFixedPayment = async (data: CreateFixedPaymentDTO): Promise<FixedPayment> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    // Store previous state for rollback
    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    // Generate temp ID and create optimistic entry
    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    const amountInCents = randsToCents(data.amount)
    const optimisticPayment: FixedPayment = {
      id: tempId,
      name: data.name,
      amount: amountInCents,
      monthId: data.monthId,
      createdAt: now,
      updatedAt: now
    }

    // Apply optimistic update
    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        fixedPayments: [...monthState.value.fixedPayments, optimisticPayment]
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'create',
      entity: 'fixedPayment',
      tempId
    })

    try {
      const newPayment = await $fetch<FixedPayment>('/api/fixed-payments', {
        method: 'POST',
        body: data
      })

      // Replace temp with real
      if (monthState.value) {
        monthState.value = {
          ...monthState.value,
          fixedPayments: monthState.value.fixedPayments.map(fp =>
            fp.id === tempId ? newPayment : fp
          )
        }
      }

      removePendingOperation(operationId)
      return newPayment
    } catch (error: any) {
      // Rollback
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to create fixed payment')
      budgetError.value = error.message || 'Failed to create fixed payment'
      throw error
    }
  }

  const updateFixedPayment = async (id: number, data: UpdateFixedPaymentDTO): Promise<FixedPayment> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    // Apply optimistic update (convert amount to cents if provided)
    const optimisticData = data.amount !== undefined
      ? { ...data, amount: randsToCents(data.amount) }
      : data

    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        fixedPayments: monthState.value.fixedPayments.map(fp =>
          fp.id === id ? { ...fp, ...optimisticData, updatedAt: getCurrentTimestamp() } : fp
        )
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'update',
      entity: 'fixedPayment',
      realId: id
    })

    try {
      const updatedPayment = await $fetch<FixedPayment>(`/api/fixed-payments/${id}`, {
        method: 'PATCH',
        body: data
      })

      // Update with server response
      if (monthState.value) {
        monthState.value = {
          ...monthState.value,
          fixedPayments: monthState.value.fixedPayments.map(fp =>
            fp.id === id ? updatedPayment : fp
          )
        }
      }

      removePendingOperation(operationId)
      return updatedPayment
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to update fixed payment')
      budgetError.value = error.message || 'Failed to update fixed payment'
      throw error
    }
  }

  const deleteFixedPayment = async (id: number): Promise<void> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    // Apply optimistic delete
    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        fixedPayments: monthState.value.fixedPayments.filter(fp => fp.id !== id)
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'delete',
      entity: 'fixedPayment',
      realId: id
    })

    try {
      await $fetch(`/api/fixed-payments/${id}`, { method: 'DELETE' })
      removePendingOperation(operationId)
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to delete fixed payment')
      budgetError.value = error.message || 'Failed to delete fixed payment'
      throw error
    }
  }

  // ============================================================================
  // Budget Categories (Optimistic)
  // ============================================================================

  const createCategory = async (data: CreateBudgetCategoryDTO): Promise<BudgetCategory> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    const allocatedInCents = randsToCents(data.allocatedAmount)
    const optimisticCategory: BudgetCategoryWithTransactions = {
      id: tempId,
      name: data.name,
      allocatedAmount: allocatedInCents,
      monthId: data.monthId,
      createdAt: now,
      updatedAt: now,
      transactions: []
    }

    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        categories: [...monthState.value.categories, optimisticCategory]
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'create',
      entity: 'category',
      tempId
    })

    try {
      const newCategory = await $fetch<BudgetCategory>('/api/categories', {
        method: 'POST',
        body: data
      })

      // Replace temp with real (keeping empty transactions array)
      if (monthState.value) {
        monthState.value = {
          ...monthState.value,
          categories: monthState.value.categories.map(cat =>
            cat.id === tempId ? { ...newCategory, transactions: [] } : cat
          )
        }
      }

      removePendingOperation(operationId)
      return newCategory
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to create category')
      budgetError.value = error.message || 'Failed to create category'
      throw error
    }
  }

  const updateCategory = async (id: number, data: UpdateBudgetCategoryDTO): Promise<BudgetCategory> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    // Apply optimistic update (convert allocatedAmount to cents if provided)
    const optimisticData = data.allocatedAmount !== undefined
      ? { ...data, allocatedAmount: randsToCents(data.allocatedAmount) }
      : data

    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        categories: monthState.value.categories.map(cat =>
          cat.id === id ? { ...cat, ...optimisticData, updatedAt: getCurrentTimestamp() } : cat
        )
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'update',
      entity: 'category',
      realId: id
    })

    try {
      const updatedCategory = await $fetch<BudgetCategory>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: data
      })

      if (monthState.value) {
        monthState.value = {
          ...monthState.value,
          categories: monthState.value.categories.map(cat =>
            cat.id === id ? { ...cat, ...updatedCategory } : cat
          )
        }
      }

      removePendingOperation(operationId)
      return updatedCategory
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to update category')
      budgetError.value = error.message || 'Failed to update category'
      throw error
    }
  }

  const deleteCategory = async (id: number): Promise<void> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        categories: monthState.value.categories.filter(cat => cat.id !== id)
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'delete',
      entity: 'category',
      realId: id
    })

    try {
      await $fetch(`/api/categories/${id}`, { method: 'DELETE' })
      removePendingOperation(operationId)
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to delete category')
      budgetError.value = error.message || 'Failed to delete category'
      throw error
    }
  }

  // ============================================================================
  // Transactions (Optimistic)
  // ============================================================================

  const createTransaction = async (data: CreateTransactionDTO): Promise<Transaction> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    const amountInCents = randsToCents(data.amount)
    const optimisticTransaction: Transaction = {
      id: tempId,
      description: data.description,
      amount: amountInCents,
      transactionDate: data.transactionDate,
      categoryId: data.categoryId,
      createdAt: now,
      updatedAt: now
    }

    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        categories: monthState.value.categories.map(cat =>
          cat.id === data.categoryId
            ? { ...cat, transactions: [...cat.transactions, optimisticTransaction] }
            : cat
        )
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'create',
      entity: 'transaction',
      tempId
    })

    try {
      const newTransaction = await $fetch<Transaction>('/api/transactions', {
        method: 'POST',
        body: data
      })

      // Replace temp ID with real ID
      if (monthState.value) {
        monthState.value = {
          ...monthState.value,
          categories: monthState.value.categories.map(cat =>
            cat.id === data.categoryId
              ? {
                  ...cat,
                  transactions: cat.transactions.map(txn =>
                    txn.id === tempId ? newTransaction : txn
                  )
                }
              : cat
          )
        }
      }

      removePendingOperation(operationId)
      return newTransaction
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to create transaction')
      budgetError.value = error.message || 'Failed to create transaction'
      throw error
    }
  }

  const updateTransaction = async (id: number, data: UpdateTransactionDTO): Promise<Transaction> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    // Apply optimistic update (convert amount to cents if provided)
    const optimisticData = data.amount !== undefined
      ? { ...data, amount: randsToCents(data.amount) }
      : data

    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        categories: monthState.value.categories.map(cat => ({
          ...cat,
          transactions: cat.transactions.map(txn =>
            txn.id === id ? { ...txn, ...optimisticData, updatedAt: getCurrentTimestamp() } : txn
          )
        }))
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'update',
      entity: 'transaction',
      realId: id
    })

    try {
      const updatedTransaction = await $fetch<Transaction>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: data
      })

      // Update with server response
      if (monthState.value) {
        monthState.value = {
          ...monthState.value,
          categories: monthState.value.categories.map(cat => ({
            ...cat,
            transactions: cat.transactions.map(txn =>
              txn.id === id ? updatedTransaction : txn
            )
          }))
        }
      }

      removePendingOperation(operationId)
      return updatedTransaction
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to update transaction')
      budgetError.value = error.message || 'Failed to update transaction'
      throw error
    }
  }

  const deleteTransaction = async (id: number): Promise<void> => {
    budgetError.value = null
    const monthState = getCurrentMonthState()

    const previousMonth = monthState.value
      ? JSON.parse(JSON.stringify(monthState.value))
      : null

    // Remove optimistically
    if (monthState.value) {
      monthState.value = {
        ...monthState.value,
        categories: monthState.value.categories.map(cat => ({
          ...cat,
          transactions: cat.transactions.filter(txn => txn.id !== id)
        }))
      }
      summary.value = recalculateSummary()
    }

    const operationId = addPendingOperation({
      type: 'delete',
      entity: 'transaction',
      realId: id
    })

    try {
      await $fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      removePendingOperation(operationId)
    } catch (error: any) {
      if (previousMonth) {
        monthState.value = previousMonth
        summary.value = recalculateSummary()
      }
      removePendingOperation(operationId)
      showErrorToast(error.message || 'Failed to delete transaction')
      budgetError.value = error.message || 'Failed to delete transaction'
      throw error
    }
  }

  // ============================================================================
  // Summary & Calculations
  // ============================================================================

  /**
   * Fetch summary for a month (used for initial load)
   */
  const fetchSummary = async (monthId: number, silent = false): Promise<MonthSummary> => {
    if (!silent) {
      isLoadingSummary.value = true
    }
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
      if (!silent) {
        isLoadingSummary.value = false
      }
    }
  }

  /**
   * Refresh summary - now just recalculates locally
   */
  const refreshSummary = async (): Promise<void> => {
    summary.value = recalculateSummary()
  }

  const clearSummary = (): void => {
    summary.value = null
  }

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
    recalculateSummary,

    // Utility
    clearError
  }
}
