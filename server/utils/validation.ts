import { z } from 'zod'

export const monthSchema = z.object({
  monthName: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  income: z.number().nonnegative(),
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
})

export const transactionSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  description: z.string().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
