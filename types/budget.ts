// TypeScript types for the budgeting application
// All timestamps are Unix timestamps in seconds (numbers)

// ============================================================================
// Database Models (matching Prisma schema)
// ============================================================================

export interface User {
  id: number
  email: string
  name: string | null
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

export interface TransactionMonth {
  id: number
  name: string
  year: number
  month: number
  income: number // stored in cents
  profileToken?: string | null // References profile for data ownership
  createdAt: number // Unix timestamp in seconds
  updatedAt?: number // Unix timestamp in seconds (optional - not always returned by API)
}

export interface TransactionFixedPayment {
  id: number
  name: string
  amount: number // stored in cents
  monthId: number
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

export interface TransactionCategory {
  id: number
  name: string
  allocatedAmount: number // stored in cents
  monthId: number
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

export interface TransactionEntry {
  id: number
  description: string
  amount: number // stored in cents
  transactionDate?: number // Unix timestamp in seconds
  categoryId: number
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

// Backwards compatibility aliases
export type Month = TransactionMonth
export type FixedPayment = TransactionFixedPayment
export type BudgetCategory = TransactionCategory
export type Transaction = TransactionEntry

// ============================================================================
// Extended Models (with relations)
// ============================================================================

export interface TransactionMonthWithRelations extends TransactionMonth {
  fixedPayments: readonly TransactionFixedPayment[]
  categories: readonly TransactionCategoryWithEntries[]
}

export interface TransactionCategoryWithEntries extends TransactionCategory {
  transactions: readonly TransactionEntry[]
}

// Backwards compatibility aliases
export type MonthWithRelations = TransactionMonthWithRelations
export type BudgetCategoryWithTransactions = TransactionCategoryWithEntries

// ============================================================================
// DTOs (Data Transfer Objects) for API requests
// ============================================================================

export interface CreateMonthDTO {
  name: string
  year: number
  month: number
  income: number // in rands (API converts to cents)
  userId?: number | null
  copyFromMonthId?: number // Optional: copy fixed payments and categories from this month
}

export interface UpdateMonthDTO {
  name?: string
  year?: number
  month?: number
  income?: number // in cents
}

export interface CreateFixedPaymentDTO {
  name: string
  amount: number // in cents
  monthId: number
}

export interface UpdateFixedPaymentDTO {
  name?: string
  amount?: number // in cents
}

export interface CreateBudgetCategoryDTO {
  name: string
  allocatedAmount: number // in cents
  monthId: number
}

export interface UpdateBudgetCategoryDTO {
  name?: string
  allocatedAmount?: number // in cents
}

export interface CreateTransactionDTO {
  description: string
  amount: number // in cents
  transactionDate?: number // Unix timestamp in seconds
  categoryId: number
}

export interface UpdateTransactionDTO {
  description?: string
  amount?: number // in cents
  transactionDate?: number // Unix timestamp in seconds
}

// ============================================================================
// Summary & Calculations
// ============================================================================

export interface CategorySummary {
  categoryId: number
  categoryName: string
  allocated: number // in cents
  spent: number // in cents
  remaining: number // in cents
}

export interface MonthSummary {
  monthId: number
  monthName: string
  income: number // in cents
  totalFixedPayments: number // in cents
  availableAfterFixed: number // in cents (income - fixed payments)
  totalBudgeted: number // in cents
  availableAfterBudgets: number // in cents (income - fixed payments - budgets)
  totalSpent: number // in cents
  totalRemaining: number // in cents (income - fixed - spent)
  categories: CategorySummary[]
}

// ============================================================================
// UI State Types
// ============================================================================

export interface MonthListItem {
  id: number
  name: string
  year: number
  month: number
  displayName: string // e.g., "January 2024"
}

export interface FormErrors {
  [key: string]: string | undefined
}

// ============================================================================
// Utility Types
// ============================================================================

export type SortDirection = 'asc' | 'desc'

export interface SortOptions {
  field: string
  direction: SortDirection
}

// Theme types
export type ThemeMode = 'light' | 'dark'
