import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// GET /api/yearly - List all yearly budgets
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)

    const yearlyBudgets = await prisma.yearlyBudget.findMany({
      where: { profileToken },
      orderBy: { year: 'desc' },
      select: {
        id: true,
        year: true,
        spendTarget: true,
        showWarnings: true,
        createdAt: true,
      },
    })

    return yearlyBudgets
  } catch (error: any) {
    return errors.serverError(event, 'Failed to fetch yearly budgets', error)
  }
})
