import prisma from '~/server/utils/db'

// GET /api/yearly/latest - Get the latest yearly budget year
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context

    const latestBudget = await prisma.yearlyBudget.findFirst({
      where: { profileToken },
      orderBy: { year: 'desc' },
      select: {
        year: true,
      },
    })

    if (!latestBudget) {
      return { year: null }
    }

    return { year: latestBudget.year }
  } catch (error) {
    console.error('Error fetching latest yearly budget:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch latest yearly budget',
    })
  }
})
