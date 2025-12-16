import prisma from '~/server/utils/db'

// GET /api/yearly/by-year/[year] - Get a yearly budget by year with all relations
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const year = parseInt(getRouterParam(event, 'year')!)

    if (isNaN(year)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid year',
      })
    }

    const yearlyBudget = await prisma.yearlyBudget.findFirst({
      where: { year, profileToken },
      include: {
        incomeSources: {
          orderBy: { orderIndex: 'asc' },
          include: {
            entries: {
              orderBy: { month: 'asc' },
              include: {
                deductions: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            categories: {
              where: { parentId: null }, // Only top-level categories
              orderBy: { orderIndex: 'asc' },
              include: {
                children: {
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    entries: {
                      orderBy: { month: 'asc' },
                    },
                  },
                },
                entries: {
                  orderBy: { month: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!yearlyBudget) {
      throw createError({
        statusCode: 404,
        message: `Budget for year ${year} not found`,
      })
    }

    return yearlyBudget
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching yearly budget by year:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch yearly budget',
    })
  }
})
