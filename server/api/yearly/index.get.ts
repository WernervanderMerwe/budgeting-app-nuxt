import prisma from '~/server/utils/db'

// GET /api/yearly - List all yearly budgets
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context

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
  } catch (error) {
    console.error('Error fetching yearly budgets:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch yearly budgets',
    })
  }
})
