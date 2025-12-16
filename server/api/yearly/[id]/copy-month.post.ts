import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// POST /api/yearly/[id]/copy-month - Copy category amounts, income entries, and deductions from one month to another
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)
    const { sourceMonth, targetMonth, resetPaidStatus = true } = body

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid budget ID',
      })
    }

    if (!sourceMonth || !targetMonth) {
      throw createError({
        statusCode: 400,
        message: 'sourceMonth and targetMonth are required',
      })
    }

    if (sourceMonth < 1 || sourceMonth > 12 || targetMonth < 1 || targetMonth > 12) {
      throw createError({
        statusCode: 400,
        message: 'Month values must be between 1 and 12',
      })
    }

    if (sourceMonth === targetMonth) {
      throw createError({
        statusCode: 400,
        message: 'Source and target months cannot be the same',
      })
    }

    // Get the budget with all categories, income sources, and deductions (ownership verified)
    const budget = await prisma.yearlyBudget.findFirst({
      where: { id, profileToken },
      include: {
        sections: {
          include: {
            categories: {
              include: {
                entries: true,
                children: {
                  include: {
                    entries: true,
                  },
                },
              },
            },
          },
        },
        incomeSources: {
          include: {
            entries: {
              include: {
                deductions: true,
              },
            },
          },
        },
      },
    })

    if (!budget) {
      throw createError({
        statusCode: 404,
        message: 'Budget not found',
      })
    }

    const now = getCurrentTimestamp()
    const categoryUpdates: { id: number; amount: number; isPaid?: boolean }[] = []
    const incomeUpdates: { id: number; grossAmount: number }[] = []
    const deductionUpdates: { id: number; amount: number }[] = []

    // Collect all category entries to update
    for (const section of budget.sections) {
      for (const category of section.categories) {
        const sourceEntry = category.entries.find(e => e.month === sourceMonth)
        const targetEntry = category.entries.find(e => e.month === targetMonth)

        if (sourceEntry && targetEntry) {
          categoryUpdates.push({
            id: targetEntry.id,
            amount: sourceEntry.amount,
            ...(resetPaidStatus ? { isPaid: false } : {}),
          })
        }

        // Also copy children entries
        for (const child of category.children) {
          const childSourceEntry = child.entries.find(e => e.month === sourceMonth)
          const childTargetEntry = child.entries.find(e => e.month === targetMonth)

          if (childSourceEntry && childTargetEntry) {
            categoryUpdates.push({
              id: childTargetEntry.id,
              amount: childSourceEntry.amount,
              ...(resetPaidStatus ? { isPaid: false } : {}),
            })
          }
        }
      }
    }

    // Collect all income entries and deductions to update
    for (const incomeSource of budget.incomeSources) {
      const sourceEntry = incomeSource.entries.find(e => e.month === sourceMonth)
      const targetEntry = incomeSource.entries.find(e => e.month === targetMonth)

      if (sourceEntry && targetEntry) {
        // Copy gross amount
        incomeUpdates.push({
          id: targetEntry.id,
          grossAmount: sourceEntry.grossAmount,
        })

        // Copy deductions by matching name
        for (const sourceDeduction of sourceEntry.deductions) {
          const targetDeduction = targetEntry.deductions.find(d => d.name === sourceDeduction.name)
          if (targetDeduction) {
            deductionUpdates.push({
              id: targetDeduction.id,
              amount: sourceDeduction.amount,
            })
          }
        }
      }
    }

    // Apply all updates in a transaction
    const allTransactions = [
      // Category entry updates
      ...categoryUpdates.map(update =>
        prisma.yearlyCategoryEntry.update({
          where: { id: update.id },
          data: {
            amount: update.amount,
            ...(update.isPaid !== undefined ? { isPaid: update.isPaid } : {}),
            updatedAt: now,
          },
        })
      ),
      // Income entry updates
      ...incomeUpdates.map(update =>
        prisma.yearlyIncomeEntry.update({
          where: { id: update.id },
          data: {
            grossAmount: update.grossAmount,
            updatedAt: now,
          },
        })
      ),
      // Deduction updates
      ...deductionUpdates.map(update =>
        prisma.yearlyDeduction.update({
          where: { id: update.id },
          data: {
            amount: update.amount,
            updatedAt: now,
          },
        })
      ),
    ]

    if (allTransactions.length > 0) {
      await prisma.$transaction(allTransactions)
    }

    return {
      success: true,
      copiedCategoryEntries: categoryUpdates.length,
      copiedIncomeEntries: incomeUpdates.length,
      copiedDeductions: deductionUpdates.length,
      sourceMonth,
      targetMonth,
      resetPaidStatus,
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error copying month data:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to copy month data',
    })
  }
})
