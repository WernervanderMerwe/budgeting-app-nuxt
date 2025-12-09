import prisma from '~/server/utils/db'

// GET /api/yearly/[id]/summary - Calculate budget summary with totals and percentages
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid budget ID',
      })
    }

    // Get the budget with all relations
    const budget = await prisma.yearlyBudget.findUnique({
      where: { id },
      include: {
        incomeSources: {
          include: {
            entries: {
              include: {
                deductions: true,
              },
              orderBy: { month: 'asc' },
            },
          },
        },
        sections: {
          include: {
            categories: {
              include: {
                entries: {
                  orderBy: { month: 'asc' },
                },
                children: {
                  include: {
                    entries: {
                      orderBy: { month: 'asc' },
                    },
                  },
                },
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!budget) {
      throw createError({
        statusCode: 404,
        message: 'Budget not found',
      })
    }

    // Calculate monthly summaries (1-12)
    const monthSummaries = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1

      // Calculate total gross income for this month
      let totalGross = 0
      let totalDeductions = 0

      for (const source of budget.incomeSources) {
        const entry = source.entries.find(e => e.month === month)
        if (entry) {
          totalGross += entry.grossAmount
          totalDeductions += entry.deductions.reduce((sum, d) => sum + d.amount, 0)
        }
      }

      const totalNet = totalGross - totalDeductions

      // Calculate section totals for this month
      const sectionSummaries = budget.sections.map(section => {
        let sectionTotal = 0

        for (const category of section.categories) {
          // Only count parent-level categories (not subcategories)
          if (!category.parentId) {
            const entry = category.entries.find(e => e.month === month)
            if (entry) {
              sectionTotal += entry.amount
            }
            // Add children amounts
            for (const child of category.children) {
              const childEntry = child.entries.find(e => e.month === month)
              if (childEntry) {
                sectionTotal += childEntry.amount
              }
            }
          }
        }

        // Calculate actual percentage of net income
        const actualPercent = totalNet > 0 ? Math.round((sectionTotal / totalNet) * 100) : 0

        return {
          sectionId: section.id,
          sectionType: section.type,
          sectionName: section.name,
          targetPercent: section.targetPercent,
          actualPercent,
          total: sectionTotal,
          isOverBudget: actualPercent > section.targetPercent,
        }
      })

      // Calculate total expenses (all sections)
      const totalExpenses = sectionSummaries.reduce((sum, s) => sum + s.total, 0)

      // Calculate leftover (net income - total expenses - spend target)
      const leftover = totalNet - totalExpenses - budget.spendTarget

      return {
        month,
        totalGross,
        totalDeductions,
        totalNet,
        totalExpenses,
        spendTarget: budget.spendTarget,
        leftover,
        sections: sectionSummaries,
      }
    })

    // Calculate yearly totals
    const yearlyTotals = {
      totalGross: monthSummaries.reduce((sum, m) => sum + m.totalGross, 0),
      totalDeductions: monthSummaries.reduce((sum, m) => sum + m.totalDeductions, 0),
      totalNet: monthSummaries.reduce((sum, m) => sum + m.totalNet, 0),
      totalExpenses: monthSummaries.reduce((sum, m) => sum + m.totalExpenses, 0),
      totalSpendTarget: budget.spendTarget * 12,
      totalLeftover: monthSummaries.reduce((sum, m) => sum + m.leftover, 0),
    }

    return {
      budgetId: budget.id,
      year: budget.year,
      spendTarget: budget.spendTarget,
      showWarnings: budget.showWarnings,
      months: monthSummaries,
      yearly: yearlyTotals,
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error calculating budget summary:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to calculate budget summary',
    })
  }
})
