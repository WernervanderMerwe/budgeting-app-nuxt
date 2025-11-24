import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const months = await prisma.month.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        year: true,
        month: true,
        income: true,
        createdAt: true,
      },
    })

    // Return as-is (values in cents)
    return months
  } catch (error) {
    console.error('Error fetching months:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch months',
    })
  }
})
