import prisma from '~/server/utils/db'

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

    // Return as-is (values in cents)
    return month
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch month',
    })
  }
})
