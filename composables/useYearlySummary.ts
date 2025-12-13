import type {
  YearlySummary,
  MonthSummary,
  SectionSummary,
  SectionType,
} from '~/types/yearly'
import { centsToRands } from '~/utils/currency'

// Cached summary state
const summary = ref<YearlySummary | null>(null)
const summaryLoading = ref(false)
const summaryError = ref<string | null>(null)

export function useYearlySummary() {
  const { currentBudget } = useYearlyBudget()
  const { getTotalNetForMonth } = useYearlyIncome()
  const { getSectionTotalForMonth, sections } = useYearlyCategories()

  // Fetch summary from API
  async function fetchSummary() {
    if (!currentBudget.value) {
      summary.value = null
      return null
    }

    summaryLoading.value = true
    summaryError.value = null
    try {
      const data = await $fetch<YearlySummary>(`/api/yearly/${currentBudget.value.id}/summary`)
      summary.value = data
      return data
    } catch (e: any) {
      summaryError.value = e.message || 'Failed to fetch summary'
      console.error('Error fetching summary:', e)
      return null
    } finally {
      summaryLoading.value = false
    }
  }

  // Get monthly leftover (net income - expenses - spend target)
  function getMonthlyLeftover(month: number): number {
    if (!currentBudget.value) return 0
    const netIncome = getTotalNetForMonth(month)
    const totalExpenses = sections.value.reduce((sum, section) => {
      return sum + getSectionTotalForMonth(section.id, month)
    }, 0)
    return netIncome - totalExpenses - currentBudget.value.spendTarget
  }

  // Get section percentage of net income for a month
  function getSectionPercentage(sectionId: number, month: number): number {
    const netIncome = getTotalNetForMonth(month)
    if (netIncome <= 0) return 0
    const sectionTotal = getSectionTotalForMonth(sectionId, month)
    return Math.round((sectionTotal / netIncome) * 100)
  }

  // Check if section is over budget for a month
  function isSectionOverBudget(sectionId: number, month: number): boolean {
    const section = sections.value.find(s => s.id === sectionId)
    if (!section) return false
    const actualPercent = getSectionPercentage(sectionId, month)
    return actualPercent > section.targetPercent
  }

  // Computed: Monthly summaries calculated from current data
  const monthlySummaries = computed<MonthSummary[]>(() => {
    if (!currentBudget.value) return []

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const totalNet = getTotalNetForMonth(month)
      const totalExpenses = sections.value.reduce((sum, section) => {
        return sum + getSectionTotalForMonth(section.id, month)
      }, 0)

      const sectionSummaries: SectionSummary[] = sections.value.map(section => {
        const totalInCents = getSectionTotalForMonth(section.id, month)
        const actualPercent = totalNet > 0 ? Math.round((totalInCents / totalNet) * 100) : 0

        return {
          sectionId: section.id,
          sectionType: section.type as SectionType,
          sectionName: section.name,
          targetPercent: section.targetPercent,
          actualPercent,
          total: centsToRands(totalInCents),
          isOverBudget: actualPercent > section.targetPercent,
        }
      })

      // Get spendTarget in cents for calculation
      const spendTargetInCents = currentBudget.value!.spendTarget

      // Calculate leftover in cents, then convert everything to rands for display
      const leftoverInCents = totalNet - totalExpenses - spendTargetInCents

      return {
        month,
        totalGross: 0, // Would need income data
        totalDeductions: 0,
        totalNet: centsToRands(totalNet),
        totalExpenses: centsToRands(totalExpenses),
        spendTarget: centsToRands(spendTargetInCents),
        leftover: centsToRands(leftoverInCents),
        sections: sectionSummaries,
      }
    })
  })

  // Computed: Yearly totals
  const yearlyTotals = computed(() => {
    if (!currentBudget.value) {
      return {
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalExpenses: 0,
        totalSpendTarget: 0,
        totalLeftover: 0,
      }
    }

    return monthlySummaries.value.reduce(
      (acc, m) => ({
        totalGross: acc.totalGross + m.totalGross,
        totalDeductions: acc.totalDeductions + m.totalDeductions,
        totalNet: acc.totalNet + m.totalNet,
        totalExpenses: acc.totalExpenses + m.totalExpenses,
        totalSpendTarget: acc.totalSpendTarget + m.spendTarget,
        totalLeftover: acc.totalLeftover + m.leftover,
      }),
      {
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalExpenses: 0,
        totalSpendTarget: 0,
        totalLeftover: 0,
      }
    )
  })

  // Get warning color class based on percentage vs target
  function getWarningClass(actualPercent: number, targetPercent: number): string {
    if (!currentBudget.value?.showWarnings) return ''
    const diff = actualPercent - targetPercent
    if (diff > 10) return 'text-red-500'
    if (diff > 5) return 'text-orange-500'
    if (diff > 0) return 'text-yellow-500'
    return 'text-green-500'
  }

  // Get leftover color class
  function getLeftoverClass(leftover: number): string {
    if (!currentBudget.value?.showWarnings) return ''
    if (leftover < 0) return 'text-red-500'
    // Convert spendTarget from cents to rands for comparison
    const spendTargetInRands = centsToRands(currentBudget.value.spendTarget)
    if (leftover < spendTargetInRands * 0.5) return 'text-yellow-500'
    return 'text-green-500'
  }

  return {
    // State
    summary: readonly(summary),
    summaryLoading: readonly(summaryLoading),
    summaryError: readonly(summaryError),
    monthlySummaries,
    yearlyTotals,

    // Actions
    fetchSummary,

    // Helpers
    getMonthlyLeftover,
    getSectionPercentage,
    isSectionOverBudget,
    getWarningClass,
    getLeftoverClass,
  }
}
