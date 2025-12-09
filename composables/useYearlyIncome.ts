import type {
  YearlyIncomeSource,
  YearlyIncomeSourceWithEntries,
  YearlyIncomeEntry,
  YearlyDeduction,
  CreateIncomeSourceDTO,
  UpdateIncomeSourceDTO,
  UpdateIncomeEntryDTO,
  CreateDeductionDTO,
  UpdateDeductionDTO,
} from '~/types/yearly'

export function useYearlyIncome() {
  const { currentBudget, fetchBudgetById } = useYearlyBudget()

  // Create a new income source
  async function createIncomeSource(dto: CreateIncomeSourceDTO) {
    try {
      const data = await $fetch<YearlyIncomeSourceWithEntries>('/api/yearly/income-sources', {
        method: 'POST',
        body: dto,
      })
      // Refresh the budget to get updated data
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return data
    } catch (e: any) {
      console.error('Error creating income source:', e)
      throw e
    }
  }

  // Update an income source
  async function updateIncomeSource(id: number, dto: UpdateIncomeSourceDTO) {
    try {
      const data = await $fetch<YearlyIncomeSource>(`/api/yearly/income-sources/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return data
    } catch (e: any) {
      console.error('Error updating income source:', e)
      throw e
    }
  }

  // Delete an income source
  async function deleteIncomeSource(id: number) {
    try {
      await $fetch(`/api/yearly/income-sources/${id}`, { method: 'DELETE' })
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return true
    } catch (e: any) {
      console.error('Error deleting income source:', e)
      throw e
    }
  }

  // Update an income entry (gross amount)
  async function updateIncomeEntry(id: number, dto: UpdateIncomeEntryDTO) {
    try {
      const data = await $fetch<YearlyIncomeEntry>(`/api/yearly/income-entries/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return data
    } catch (e: any) {
      console.error('Error updating income entry:', e)
      throw e
    }
  }

  // Create a deduction
  async function createDeduction(dto: CreateDeductionDTO) {
    try {
      const data = await $fetch<YearlyDeduction>('/api/yearly/deductions', {
        method: 'POST',
        body: dto,
      })
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return data
    } catch (e: any) {
      console.error('Error creating deduction:', e)
      throw e
    }
  }

  // Update a deduction
  async function updateDeduction(id: number, dto: UpdateDeductionDTO) {
    try {
      const data = await $fetch<YearlyDeduction>(`/api/yearly/deductions/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return data
    } catch (e: any) {
      console.error('Error updating deduction:', e)
      throw e
    }
  }

  // Delete a deduction
  async function deleteDeduction(id: number) {
    try {
      await $fetch(`/api/yearly/deductions/${id}`, { method: 'DELETE' })
      if (currentBudget.value) {
        await fetchBudgetById(currentBudget.value.id)
      }
      return true
    } catch (e: any) {
      console.error('Error deleting deduction:', e)
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
