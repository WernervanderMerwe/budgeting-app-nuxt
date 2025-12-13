import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// POST /api/yearly/[id]/clear-month - Reset all values for a month to zero
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)
    const { month, resetPaidStatus = true } = body

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid budget ID',
      })
    }

    if (!month || month < 1 || month > 12) {
      throw createError({
        statusCode: 400,
        message: 'Month must be between 1 and 12',
      })
    }

    // Get the budget with all categories, income sources, and deductions
    const budget = await prisma.yearlyBudget.findUnique({
      where: { id },
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
    const categoryUpdates: { id: number }[] = []
    const incomeUpdates: { id: number }[] = []
    const deductionUpdates: { id: number }[] = []

    // Collect all category entries to reset
    for (const section of budget.sections) {
      for (const category of section.categories) {
        const entry = category.entries.find(e => e.month === month)
        if (entry) {
          categoryUpdates.push({ id: entry.id })
        }

        // Also reset children entries
        for (const child of category.children) {
          const childEntry = child.entries.find(e => e.month === month)
          if (childEntry) {
            categoryUpdates.push({ id: childEntry.id })
          }
        }
      }
    }

    // Collect all income entries and deductions to reset
    for (const incomeSource of budget.incomeSources) {
      const entry = incomeSource.entries.find(e => e.month === month)
      if (entry) {
        incomeUpdates.push({ id: entry.id })

        // Reset all deductions for this entry
        for (const deduction of entry.deductions) {
          deductionUpdates.push({ id: deduction.id })
        }
      }
    }

    // Apply all updates in a transaction
    const allTransactions = [
      // Category entry updates - reset to 0
      ...categoryUpdates.map(update =>
        prisma.yearlyCategoryEntry.update({
          where: { id: update.id },
          data: {
            amount: 0,
            ...(resetPaidStatus ? { isPaid: false } : {}),
            updatedAt: now,
          },
        })
      ),
      // Income entry updates - reset to 0
      ...incomeUpdates.map(update =>
        prisma.yearlyIncomeEntry.update({
          where: { id: update.id },
          data: {
            grossAmount: 0,
            updatedAt: now,
          },
        })
      ),
      // Deduction updates - reset to 0
      ...deductionUpdates.map(update =>
        prisma.yearlyDeduction.update({
          where: { id: update.id },
          data: {
            amount: 0,
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
      clearedCategoryEntries: categoryUpdates.length,
      clearedIncomeEntries: incomeUpdates.length,
      clearedDeductions: deductionUpdates.length,
      month,
      resetPaidStatus,
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error clearing month data:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to clear month data',
    })
  }
})
