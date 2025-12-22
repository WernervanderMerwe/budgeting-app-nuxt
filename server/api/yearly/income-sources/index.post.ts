import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { simulateTestError } from '~/server/utils/testError'
import { errors } from '~/server/utils/errors'

// POST /api/yearly/income-sources - Create a new income source with 12 month entries
export default defineEventHandler(async (event) => {
  try {
    // DEV ONLY: Simulate errors for testing optimistic updates
    await simulateTestError(event)

    const { profileToken } = event.context
    const body = await readBody(event)
    const { yearlyBudgetId, name, orderIndex = 0 } = body

    if (!yearlyBudgetId || !name) {
      return errors.badRequest(event, 'yearlyBudgetId and name are required')
    }

    // Verify ownership of the budget
    const budget = await prisma.yearlyBudget.findFirst({
      where: { id: yearlyBudgetId, profileToken },
    })

    if (!budget) {
      return errors.notFound(event, 'Budget not found')
    }

    const now = getCurrentTimestamp()

    // Create income source with 12 month entries (one for each month)
    const incomeSource = await prisma.yearlyIncomeSource.create({
      data: {
        yearlyBudgetId,
        name,
        orderIndex,
        createdAt: now,
        updatedAt: now,
        entries: {
          create: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1, // 1-12
            grossAmount: 0,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
      include: {
        entries: {
          orderBy: { month: 'asc' },
          include: {
            deductions: true,
          },
        },
      },
    })

    return incomeSource
  } catch (error) {
    return errors.serverError(event, 'Failed to create income source', error as Error)
  }
})
