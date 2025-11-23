import prisma from '~/server/utils/db'
import { centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const months = await prisma.month.findMany({
      orderBy: [
        { year: 'desc' },
        { monthName: 'desc' },
      ],
      select: {
        id: true,
        monthName: true,
        year: true,
        income: true,
        createdAt: true,
      },
    })

    // Convert cents to rands for frontend
    return months.map((month) => ({
      ...month,
      income: centsToRands(month.income),
    }))
  } catch (error) {
    console.error('Error fetching months:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch months',
    })
  }
})
