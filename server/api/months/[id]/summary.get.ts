import type { FixedPayment, BudgetCategory, Transaction } from '@prisma/client'
import prisma from '~/server/utils/db'

interface CategorySpending {
  categoryId: number
  categoryName: string
  allocated: number
  spent: number
  remaining: number
  overBudget: number
}

interface MonthSummary {
  monthId: number
  monthName: string
  income: number
  totalFixedPayments: number
  availableAfterFixed: number
  totalBudgeted: number
  availableAfterBudgets: number
  totalSpent: number
  totalRemaining: number
  categories: CategorySpending[]
}

export default defineEventHandler(async (event): Promise<MonthSummary> => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    const month = await prisma.month.findUnique({
      where: { id },
      include: {
        fixedPayments: true,
        categories: {
          include: {
            transactions: true,
          },
        },
      },
    })

    if (!month) {
      throw createError({
        statusCode: 404,
        message: 'Month not found',
      })
    }

    // Calculate fixed payments total
    const fixedPaymentsTotal = month.fixedPayments.reduce(
      (sum: number, fp: FixedPayment) => sum + fp.amount,
      0
    )

    // Calculate budget allocations total
    const budgetAllocationsTotal = month.categories.reduce(
      (sum: number, cat: BudgetCategory) => sum + cat.allocatedAmount,
      0
    )

    // Calculate category spending
    const categorySpending: CategorySpending[] = month.categories.map((cat: BudgetCategory & { transactions: Transaction[] }) => {
      const spent = cat.transactions.reduce((sum: number, txn: Transaction) => sum + txn.amount, 0)
      const remaining = cat.allocatedAmount - spent

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        allocated: cat.allocatedAmount,
        spent: spent,
        remaining: remaining > 0 ? remaining : 0,
        overBudget: remaining < 0 ? Math.abs(remaining) : 0,
      }
    })

    // Calculate totals
    const totalActualSpending = month.categories.reduce(
      (sum: number, cat: BudgetCategory & { transactions: Transaction[] }) => sum + cat.transactions.reduce((txnSum: number, txn: Transaction) => txnSum + txn.amount, 0),
      0
    )

    const afterFixedPayments = month.income - fixedPaymentsTotal
    const afterBudgetAllocations = afterFixedPayments - budgetAllocationsTotal
    const totalMoneyLeft = month.income - fixedPaymentsTotal - totalActualSpending

    return {
      monthId: month.id,
      monthName: month.name,
      income: month.income,
      totalFixedPayments: fixedPaymentsTotal,
      availableAfterFixed: afterFixedPayments,
      totalBudgeted: budgetAllocationsTotal,
      availableAfterBudgets: afterBudgetAllocations,
      totalSpent: totalActualSpending,
      totalRemaining: totalMoneyLeft,
      categories: categorySpending,
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error calculating summary:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to calculate summary',
    })
  }
})
