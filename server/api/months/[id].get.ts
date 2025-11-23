import type { FixedPayment, BudgetCategory, Transaction } from '@prisma/client'
import prisma from '~/server/utils/db'
import { centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
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
        fixedPayments: {
          orderBy: { orderIndex: 'asc' },
        },
        categories: {
          orderBy: { orderIndex: 'asc' },
          include: {
            transactions: {
              orderBy: { transactionDate: 'desc' },
            },
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

    // Convert all monetary values from cents to rands
    return {
      ...month,
      income: centsToRands(month.income),
      fixedPayments: month.fixedPayments.map((fp: FixedPayment) => ({
        ...fp,
        amount: centsToRands(fp.amount),
      })),
      categories: month.categories.map((cat: BudgetCategory & { transactions: Transaction[] }) => ({
        ...cat,
        allocatedAmount: centsToRands(cat.allocatedAmount),
        transactions: cat.transactions.map((txn: Transaction) => ({
          ...txn,
          amount: centsToRands(txn.amount),
        })),
      })),
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch month',
    })
  }
})
