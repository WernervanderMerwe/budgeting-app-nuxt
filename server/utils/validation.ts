import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '~~/shared/utils/expense-categories'

export const monthSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  income: z.number().nonnegative(),
  copyFromMonthId: z.number().int().positive().optional(),
})

export const fixedPaymentSchema = z.object({
  monthId: z.number().int().positive(),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  orderIndex: z.number().int().nonnegative().optional(),
})

export const categorySchema = z.object({
  monthId: z.number().int().positive(),
  name: z.string().min(1),
  allocatedAmount: z.number().nonnegative(),
  orderIndex: z.number().int().nonnegative().optional(),
  expenseCategory: z.enum(EXPENSE_CATEGORIES).nullable().optional(),
})

export const categoryPatchSchema = z.object({
  name: z.string().min(1).optional(),
  allocatedAmount: z.number().nonnegative().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  expenseCategory: z.enum(EXPENSE_CATEGORIES).nullable().optional(),
})

export const learnVendorMappingSchema = z.object({
  vendor: z.string().min(1),
  // Nullable: the client calls this endpoint even when the chosen budget
  // category has no expense-category tag, because it is the ONLY writer of
  // ReceiptTextCorrection — see learnVendorMapping in server/utils/vendor-mapping.ts.
  expenseCategory: z.enum(EXPENSE_CATEGORIES).nullable(),
  rawMerchant: z.string().nullable().optional(),
})

export const vendorMappingPatchSchema = z.object({
  expenseCategory: z.enum(EXPENSE_CATEGORIES),
})

export const receiptCorrectionPatchSchema = z.object({
  resolved: z.literal(true),
})

export const transactionSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  description: z.string().optional(),
  transactionDate: z.number().int().positive().optional(), // Unix timestamp in seconds
})
