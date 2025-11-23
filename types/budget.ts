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

export interface Month {
  id: number
  name: string
  year: number
  month: number
  income: number // stored in cents
  userId: number | null
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

export interface FixedPayment {
  id: number
  name: string
  amount: number // stored in cents
  monthId: number
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

export interface BudgetCategory {
  id: number
  name: string
  budgetedAmount: number // stored in cents
  monthId: number
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

export interface Transaction {
  id: number
  description: string
  amount: number // stored in cents
  transactionDate?: number // Unix timestamp in seconds
  categoryId: number
  createdAt: number // Unix timestamp in seconds
  updatedAt: number // Unix timestamp in seconds
}

// ============================================================================
// Extended Models (with relations)
// ============================================================================

export interface MonthWithRelations extends Month {
  fixedPayments: readonly FixedPayment[]
  categories: readonly BudgetCategoryWithTransactions[]
}

export interface BudgetCategoryWithTransactions extends BudgetCategory {
  transactions: readonly Transaction[]
}

// ============================================================================
// DTOs (Data Transfer Objects) for API requests
// ============================================================================

export interface CreateMonthDTO {
  name: string
  year: number
  month: number
  income: number // in cents
  userId?: number | null
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
  budgetedAmount: number // in cents
  monthId: number
}

export interface UpdateBudgetCategoryDTO {
  name?: string
  budgetedAmount?: number // in cents
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
  budgeted: number // in cents
  spent: number // in cents
  remaining: number // in cents
}

export interface MonthSummary {
  monthId: number
  monthName: string
  income: number // in cents
  totalFixedPayments: number // in cents
  totalBudgeted: number // in cents
  totalSpent: number // in cents
  availableAfterFixed: number // in cents (income - fixed payments)
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
