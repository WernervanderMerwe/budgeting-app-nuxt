// Types for the vendor -> expense category mapping screen.
// See docs/plans/2026-08-22-vendor-expense-category-design.md for the full design.
// All timestamps are Unix timestamps in seconds (numbers) - use dayjs, never Date.

import type { ExpenseCategory } from '~~/shared/utils/expense-categories'

export interface VendorMapping {
  id: number
  vendor: string
  expenseCategory: ExpenseCategory
  timesSeen: number
  lastSeenAt: number // Unix timestamp in seconds
  // Shipped default (profileToken NULL server-side). Read-only: the API
  // returns 403 on PATCH/DELETE, so the UI must not offer those actions.
  isDefault: boolean
}

export interface ReceiptCorrection {
  id: number
  rawText: string // what OCR produced, e.g. "SHEL1 VREDEKLOOF"
  correctedTo: string // what the user retyped it as, e.g. "Shell"
  timesSeen: number
  lastSeenAt: number // Unix timestamp in seconds
}
