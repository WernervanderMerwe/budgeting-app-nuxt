// Yearly Budget Types for Yearly Overview Mode

// Enums
export type SectionType = 'LIVING' | 'NON_ESSENTIAL' | 'SAVINGS'

// Base Models (matching Prisma schema)
export interface YearlyBudget {
  id: number
  userId: number | null
  year: number
  spendTarget: number // In cents
  showWarnings: boolean
  createdAt: number
  updatedAt: number
}

export interface YearlyIncomeSource {
  id: number
  yearlyBudgetId: number
  name: string
  orderIndex: number
  createdAt: number
  updatedAt: number
}

export interface YearlyIncomeEntry {
  id: number
  incomeSourceId: number
  month: number // 1-12
  grossAmount: number // In cents
  createdAt: number
  updatedAt: number
}

export interface YearlyDeduction {
  id: number
  incomeEntryId: number
  name: string
  amount: number // In cents
  orderIndex: number
  createdAt: number
  updatedAt: number
}

export interface YearlySection {
  id: number
  yearlyBudgetId: number
  type: SectionType
  name: string
  targetPercent: number // 70, 20, or 10
  orderIndex: number
  createdAt: number
  updatedAt: number
}

export interface YearlyCategory {
  id: number
  sectionId: number
  parentId: number | null
  name: string
  orderIndex: number
  createdAt: number
  updatedAt: number
}

export interface YearlyCategoryEntry {
  id: number
  categoryId: number
  month: number // 1-12
  amount: number // In cents
  isPaid: boolean
  createdAt: number
  updatedAt: number
}

// Models with Relations
export interface YearlyIncomeEntryWithDeductions extends YearlyIncomeEntry {
  deductions: YearlyDeduction[]
}

export interface YearlyIncomeSourceWithEntries extends YearlyIncomeSource {
  entries: YearlyIncomeEntryWithDeductions[]
}

export interface YearlyCategoryWithEntries extends YearlyCategory {
  entries: YearlyCategoryEntry[]
}

export interface YearlyCategoryWithChildren extends YearlyCategoryWithEntries {
  children: YearlyCategoryWithEntries[]
}

export interface YearlySectionWithCategories extends YearlySection {
  categories: YearlyCategoryWithChildren[]
}

export interface YearlyBudgetWithRelations extends YearlyBudget {
  incomeSources: YearlyIncomeSourceWithEntries[]
  sections: YearlySectionWithCategories[]
}

// DTOs for API calls
export interface CreateYearlyBudgetDTO {
  year: number
  userId?: number
  spendTarget?: number
  showWarnings?: boolean
}

export interface UpdateYearlyBudgetDTO {
  spendTarget?: number
  showWarnings?: boolean
}

export interface CreateIncomeSourceDTO {
  yearlyBudgetId: number
  name: string
  orderIndex?: number
}

export interface UpdateIncomeSourceDTO {
  name?: string
  orderIndex?: number
}

export interface UpdateIncomeEntryDTO {
  grossAmount?: number
}

export interface CreateDeductionDTO {
  incomeEntryId: number
  name: string
  amount?: number
  orderIndex?: number
}

export interface UpdateDeductionDTO {
  name?: string
  amount?: number
  orderIndex?: number
}

export interface UpdateSectionDTO {
  name?: string
  targetPercent?: number
  orderIndex?: number
}

export interface CreateCategoryDTO {
  sectionId: number
  name: string
  parentId?: number
  orderIndex?: number
}

export interface UpdateCategoryDTO {
  name?: string
  parentId?: number
  orderIndex?: number
}

export interface UpdateCategoryEntryDTO {
  amount?: number
  isPaid?: boolean
}

export interface BulkUpdateCategoryEntryDTO {
  id: number
  amount?: number
  isPaid?: boolean
}

export interface CopyMonthDTO {
  sourceMonth: number
  targetMonth: number
  resetPaidStatus?: boolean
}

// Summary Types
export interface SectionSummary {
  sectionId: number
  sectionType: SectionType
  sectionName: string
  targetPercent: number
  actualPercent: number
  total: number
  isOverBudget: boolean
}

export interface MonthSummary {
  month: number
  totalGross: number
  totalDeductions: number
  totalNet: number
  totalExpenses: number
  spendTarget: number
  leftover: number
  sections: SectionSummary[]
}

export interface YearlyTotals {
  totalGross: number
  totalDeductions: number
  totalNet: number
  totalExpenses: number
  totalSpendTarget: number
  totalLeftover: number
}

export interface YearlySummary {
  budgetId: number
  year: number
  spendTarget: number
  showWarnings: boolean
  months: MonthSummary[]
  yearly: YearlyTotals
}

// UI State Types
export interface YearlyState {
  budgets: YearlyBudget[]
  currentBudget: YearlyBudgetWithRelations | null
  selectedYear: number
  loading: boolean
  error: string | null
}

// Month names helper
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const
