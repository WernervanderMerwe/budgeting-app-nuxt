import type {
  YearlyIncomeSource,
  YearlyIncomeSourceWithEntries,
  YearlyIncomeEntry,
  YearlyDeduction,
  YearlyBudgetWithRelations,
  CreateIncomeSourceDTO,
  UpdateIncomeSourceDTO,
  UpdateIncomeEntryDTO,
  CreateDeductionDTO,
  UpdateDeductionDTO,
} from '~/types/yearly'
import { generateTempId, useOptimisticUpdates } from './useOptimisticUpdates'
import { getWritableYearlyBudget } from './useYearlyBudget'
import { getCurrentTimestamp } from '~/utils/date'
// NOTE: randsToCents not needed here - components convert before calling composable

export function useYearlyIncome() {
  const { currentBudget } = useYearlyBudget()
  const { showErrorToast } = useOptimisticUpdates()

  // Helper to get writable budget state
  const getBudgetState = () => getWritableYearlyBudget()

  // Create a new income source (optimistic)
  async function createIncomeSource(dto: CreateIncomeSourceDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Generate temp ID and create optimistic entry with 12 month entries
    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    const optimisticSource: YearlyIncomeSourceWithEntries = {
      id: tempId,
      yearlyBudgetId: dto.yearlyBudgetId,
      name: dto.name,
      orderIndex: dto.orderIndex ?? 0,
      createdAt: now,
      updatedAt: now,
      entries: Array.from({ length: 12 }, (_, i) => ({
        id: generateTempId(),
        incomeSourceId: tempId,
        month: i + 1,
        grossAmount: 0,
        createdAt: now,
        updatedAt: now,
        deductions: [],
      })),
    }

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: [...budgetState.value.incomeSources, optimisticSource],
      }
    }

    try {
      const data = await $fetch<YearlyIncomeSourceWithEntries>('/api/yearly/income-sources', {
        method: 'POST',
        body: dto,
      })
      // Replace temp income source with real one (don't refresh to avoid race conditions)
      if (budgetState.value) {
        budgetState.value = {
          ...budgetState.value,
          incomeSources: budgetState.value.incomeSources.map(source =>
            source.id === tempId ? data : source
          ),
        }
      }
      return data
    } catch (e: any) {
      // Rollback
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to create income source')
      throw e
    }
  }

  // Update an income source (optimistic)
  async function updateIncomeSource(id: number, dto: UpdateIncomeSourceDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: budgetState.value.incomeSources.map(source =>
          source.id === id
            ? { ...source, ...dto, updatedAt: getCurrentTimestamp() }
            : source
        ),
      }
    }

    try {
      const data = await $fetch<YearlyIncomeSource>(`/api/yearly/income-sources/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to update income source')
      throw e
    }
  }

  // Delete an income source (optimistic)
  async function deleteIncomeSource(id: number) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic delete
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: budgetState.value.incomeSources.filter(source => source.id !== id),
      }
    }

    try {
      await $fetch(`/api/yearly/income-sources/${id}`, { method: 'DELETE' })
      return true
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to delete income source')
      throw e
    }
  }

  // Update an income entry (gross amount) - optimistic
  // NOTE: Component already converts RANDS→CENTS before calling, so we use dto directly
  async function updateIncomeEntry(id: number, dto: UpdateIncomeEntryDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: budgetState.value.incomeSources.map(source => ({
          ...source,
          entries: source.entries.map(entry =>
            entry.id === id
              ? { ...entry, ...dto, updatedAt: getCurrentTimestamp() }
              : entry
          ),
        })),
      }
    }

    try {
      const data = await $fetch<YearlyIncomeEntry>(`/api/yearly/income-entries/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to update income entry')
      throw e
    }
  }

  // Create a deduction (optimistic)
  // NOTE: Component already converts RANDS→CENTS before calling, so dto.amount is already in cents
  async function createDeduction(dto: CreateDeductionDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    // Use dto.amount directly - component already converted to cents (default to 0 if undefined)
    const optimisticDeduction: YearlyDeduction = {
      id: tempId,
      incomeEntryId: dto.incomeEntryId,
      name: dto.name,
      amount: dto.amount ?? 0,
      orderIndex: dto.orderIndex ?? 0,
      createdAt: now,
      updatedAt: now,
    }

    // Apply optimistic update - find the entry and add deduction
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: budgetState.value.incomeSources.map(source => ({
          ...source,
          entries: source.entries.map(entry =>
            entry.id === dto.incomeEntryId
              ? { ...entry, deductions: [...entry.deductions, optimisticDeduction] }
              : entry
          ),
        })),
      }
    }

    try {
      const data = await $fetch<YearlyDeduction>('/api/yearly/deductions', {
        method: 'POST',
        body: dto,
      })
      // Replace temp deduction with real one (don't refresh to avoid race conditions)
      if (budgetState.value) {
        budgetState.value = {
          ...budgetState.value,
          incomeSources: budgetState.value.incomeSources.map(source => ({
            ...source,
            entries: source.entries.map(entry =>
              entry.id === dto.incomeEntryId
                ? { ...entry, deductions: entry.deductions.map(ded => ded.id === tempId ? data : ded) }
                : entry
            ),
          })),
        }
      }
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to create deduction')
      throw e
    }
  }

  // Update a deduction (optimistic)
  // NOTE: Component already converts RANDS→CENTS before calling, so we use dto directly
  async function updateDeduction(id: number, dto: UpdateDeductionDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: budgetState.value.incomeSources.map(source => ({
          ...source,
          entries: source.entries.map(entry => ({
            ...entry,
            deductions: entry.deductions.map(ded =>
              ded.id === id
                ? { ...ded, ...dto, updatedAt: getCurrentTimestamp() }
                : ded
            ),
          })),
        })),
      }
    }

    try {
      const data = await $fetch<YearlyDeduction>(`/api/yearly/deductions/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to update deduction')
      throw e
    }
  }

  // Delete a deduction (optimistic)
  async function deleteDeduction(id: number) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic delete
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        incomeSources: budgetState.value.incomeSources.map(source => ({
          ...source,
          entries: source.entries.map(entry => ({
            ...entry,
            deductions: entry.deductions.filter(ded => ded.id !== id),
          })),
        })),
      }
    }

    try {
      await $fetch(`/api/yearly/deductions/${id}`, { method: 'DELETE' })
      return true
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to delete deduction')
      throw e
    }
  }

  // Computed: All income sources from current budget
  const incomeSources = computed(() => {
    return currentBudget.value?.incomeSources ?? []
  })

  // Computed: Get total gross income for a specific month
  function getTotalGrossForMonth(month: number): number {
    if (!currentBudget.value) return 0
    return currentBudget.value.incomeSources.reduce((sum, source) => {
      const entry = source.entries.find(e => e.month === month)
      return sum + (entry?.grossAmount ?? 0)
    }, 0)
  }

  // Computed: Get total deductions for a specific month
  function getTotalDeductionsForMonth(month: number): number {
    if (!currentBudget.value) return 0
    return currentBudget.value.incomeSources.reduce((sum, source) => {
      const entry = source.entries.find(e => e.month === month)
      if (!entry) return sum
      return sum + entry.deductions.reduce((dSum, d) => dSum + d.amount, 0)
    }, 0)
  }

  // Computed: Get total net income for a specific month
  function getTotalNetForMonth(month: number): number {
    return getTotalGrossForMonth(month) - getTotalDeductionsForMonth(month)
  }

  // Computed: Get income entry for a source and month
  function getIncomeEntry(sourceId: number, month: number) {
    const source = currentBudget.value?.incomeSources.find(s => s.id === sourceId)
    return source?.entries.find(e => e.month === month)
  }

  // Computed: Monthly totals for all 12 months
  const monthlyIncomeTotals = computed(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const gross = getTotalGrossForMonth(month)
      const deductions = getTotalDeductionsForMonth(month)
      return {
        month,
        gross,
        deductions,
        net: gross - deductions,
      }
    })
  })

  // Computed: Yearly totals
  const yearlyIncomeTotals = computed(() => {
    const totals = monthlyIncomeTotals.value.reduce(
      (acc, m) => ({
        gross: acc.gross + m.gross,
        deductions: acc.deductions + m.deductions,
        net: acc.net + m.net,
      }),
      { gross: 0, deductions: 0, net: 0 }
    )
    return totals
  })

  return {
    // State
    incomeSources,
    monthlyIncomeTotals,
    yearlyIncomeTotals,

    // Actions
    createIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    updateIncomeEntry,
    createDeduction,
    updateDeduction,
    deleteDeduction,

    // Helpers
    getTotalGrossForMonth,
    getTotalDeductionsForMonth,
    getTotalNetForMonth,
    getIncomeEntry,
  }
}
