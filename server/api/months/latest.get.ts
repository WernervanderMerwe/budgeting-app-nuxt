import prisma from '~/server/utils/db'

// GET /api/months/latest - Get the latest transaction month year/month
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context

    const latestMonth = await prisma.transactionMonth.findFirst({
      where: { profileToken },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      select: {
        id: true,
        year: true,
        month: true,
      },
    })

    if (!latestMonth) {
      return { id: null, year: null, month: null }
    }

    return {
      id: latestMonth.id,
      year: latestMonth.year,
      month: latestMonth.month,
    }
  } catch (error) {
    console.error('Error fetching latest month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch latest month',
    })
  }
})
